import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { Effect } from 'aws-cdk-lib/aws-iam';
import * as path from 'path'
import * as fs from 'fs'
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export class EventbridgeWebhookStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // lambda to process webhook events 
    const func = new cdk.aws_lambda.Function(
      this,
      "ProcessWebHookFunc",
      {
        functionName: "ProcessWebHookFunc",
        code: cdk.aws_lambda.Code.fromInline(
          fs.readFileSync(path.resolve(__dirname, "./../lambda/index.py"), { encoding: "utf-8" })
        ),
        handler: "index.handler",
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_7,
        timeout: Duration.seconds(10),
        memorySize: 512,
        initialPolicy: [
          new cdk.aws_iam.PolicyStatement({
            effect: Effect.ALLOW,
            // better here 
            resources: ["*"],
            actions: ["events:PutEvents"]
          })
        ]
      }
    )


    // eventbridge rule to receive events from webhook 
    const receivedRule = new cdk.aws_events.CfnRule(
      this,
      "ReceivedRule",
      {
        name: "ReceivedRule",
        eventPattern: {
          source: ['github.com'],
        },
        targets: [
          {
            arn: func.functionArn,
            id: "LambdaProcessWebHook"
          }
        ]
      }
    )

    // clodwatch logroup for storing processed events from lambda 
    const logGroup = new cdk.aws_logs.LogGroup(
      this,
      "StoreProcessedEventsLogGroup",
      {
        logGroupName: "StoreProcessedEventsLogGroup",
        retention: RetentionDays.ONE_DAY
      }
    )


    // eventbridge rule to write processed events to a loggroup 
    const writeToLogGroupRule = new cdk.aws_events.CfnRule(
      this,
      "WriteToLogGroupRule",
      {
        name: "WriteToLogGroupRule",
        eventPattern: {
          source: ["webhook.app"]
        },
        targets: [
          {
            arn: logGroup.logGroupArn,
            id: "LogGroupForProcessedEvent"
          }
        ]
      }
    )


    // permission eventbridge write to logroup 
    logGroup.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        resources: ["*"],
        actions: ["logs:*"],
        principals: [new cdk.aws_iam.ServicePrincipal("events.amazonaws.com")]
      })
    )

    // eventbridge invoke lambda function 
    func.addPermission(
      "AllowEventBridgeInvokeLambda",
      {
        principal: new cdk.aws_iam.ServicePrincipal("events.amazonaws.com")
      }
    )

  }
}
