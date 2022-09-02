---
title: AWS EventBridge and GitHub WebHook
description: EventBridge receive events from GitHub
author: haimtran
publishedDate: 09/02/2022
date: 2022-09-02
---

## Introduction

[GitHub](https://github.com/entest-hai/eventbridge-webhook) this show how to integrate eventbridge with different targets. Different targest requires different ways of granting permission to the eventbridge either by 1) resource-based policy or 2) iam role.

- lambda function
- cloudwatch log
- stepfunction

<LinkedImage
  href="https://youtu.be/tzq96r9CmRg"
  height={400}
  alt="EventBridge GitHub WebHook"
  src="/thumbnail/eventbridge-github.png"
/>

## EventBridge Rule

eventbridge rule to receive github webhook

```tsx
const receivedRule = new cdk.aws_events.CfnRule(this, 'ReceivedRule', {
  name: 'ReceivedRule',
  eventPattern: {
    source: ['github.com']
  },
  targets: [
    {
      arn: props.enrichArn,
      id: 'ProcessWebHookApp'
    }
  ]
})
```

eventbridge rule to send processed events to cloudwatch log group

```tsx
const sendbackRule = new cdk.aws_events.CfnRule(this, 'L1Rule', {
  name: 'SendEventsToLogGroupRule',
  eventPattern: {
    source: ['webhook.app']
  },
  targets: [
    {
      arn: log.logGroupArn,
      id: log.logGroupName
    }
  ]
})

// allow eventbridge to write to cloudwatch log
log.addToResourcePolicy(
  new cdk.aws_iam.PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['logs:*'],
    resources: ['*'],
    principals: [new cdk.aws_iam.ServicePrincipal('events.amazonaws.com')]
  })
)
```

lambda function to process the webhook event

```py
from datetime import datetime
import json
import boto3

eventClient = boto3.client('events')

def handler(event, context):
    """
    send three entries to enventbridge
    """
    resp = eventClient.put_events(
        Entries=[
            {
                'Time': datetime.now(),
                'Source': 'webhook.app',
                'Detail': json.dumps({'title': 'order event', 'event': event}),
                'DetailType': 'order',
            }
        ]
    )
    print(resp)
    return (
        {
            'message': 'procuder'
        }
    )
```

lambda function and allow eventbridge to invoke it

```tsx
const func = new aws_lambda.Function(this, 'SendEventFunction', {
  functionName: 'SendEventFunction',
  code: aws_lambda.Code.fromInline(
    fs.readFileSync(path.resolve(__dirname, './../lambda/enrich.py'), {
      encoding: 'utf-8'
    })
  ),
  handler: 'index.handler',
  runtime: aws_lambda.Runtime.PYTHON_3_7,
  timeout: Duration.seconds(10),
  initialPolicy: [
    new aws_iam.PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['events:PutEvents']
    })
  ]
})

func.addPermission('AllowEventBridgeInvokeThisLambda', {
  principal: new aws_iam.ServicePrincipal('events.amazonaws.com')
})
```

## EventBridge Targets

Eventbridge need granted permission to invoke other services by means of 1) resource-based policy or 2) iam role.

- Resouce-based policy: apigw, lambda, sns, sqs, cloudwatch log. For example, to invoke agigw endpoint by eventbridge, add this policy to the policy of the apigw endpoint

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "events.amazonaws.com"
      },
      "Action": "execute-api:Invoke",
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": "arn:aws:events:region:account-id:rule/rule-name"
        }
      },
      "Resource": ["execute-api:/stage/GET/api"]
    }
  ]
}
```

- Iam role: ec2 instances, kinesis data stream, stepfunctions

## Reference

[resource-based policy for eventbridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html)

[cloudformation eventbridge rule](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-events-rule.html)

[Setup github webhook with eventbridge](https://aws.amazon.com/about-aws/whats-new/2022/08/amazon-eventbridge-supports-receiving-events-github-stripe-twilio-using-webhooks/)

