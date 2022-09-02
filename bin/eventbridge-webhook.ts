#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EventbridgeWebhookStack } from '../lib/eventbridge-webhook-stack';

const app = new cdk.App();
new EventbridgeWebhookStack(app, 'EventbridgeWebhookStack', {
  env: {
    region: "us-east-1"
  }
});
