"""
haimtran 29 JUL 2022
send events to eventbridge using boto3
"""
from datetime import datetime
import json
import boto3


eventClient = boto3.client('events')


def handler(event, context):
    """
    send three entries to enventbridge
    """
    # process webhook events here 

    # send events to eventbridge
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


