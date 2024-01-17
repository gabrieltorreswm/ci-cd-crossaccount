#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CiCdCrossaccountStack } from '../lib/ci-cd-crossaccount-stack';

const app = new cdk.App();
new CiCdCrossaccountStack(app, 'ci-cd-crossaccount', {
  env: {
    account: "937729235844",
    region: "us-east-1"
  }
});