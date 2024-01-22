#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CiCdCrossaccountStack } from '../lib/ci-cd-crossaccount-stack';

const app = new cdk.App();
new CiCdCrossaccountStack(app, 'ci-cd-crossaccount', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION 
  },
  tags: {
    accountB: "22222222" // set the ACCOUNT_B
  }
});