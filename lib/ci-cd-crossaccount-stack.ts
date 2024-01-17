import * as cdk from 'aws-cdk-lib';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import { CompositePrincipal, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

export class CiCdCrossaccountStack extends cdk.Stack {
  constructor(scope: any, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    //Pipeline Role definition
    const rolePipeline = new Role(this,"pipeline-role",{
      roleName: "pipeline-role",
      assumedBy: new CompositePrincipal(
          new ServicePrincipal('codepipeline.amazone.com'),
          new ServicePrincipal('codebuild.amazonaws.com')
          )
    })
    // Pipeline first definition
    const pipeLineCrossAccount = new Pipeline(this,"pipeline-cross-account",{
      pipelineName: "pipeline-cross-account",
      //crossAccountKeys:true,
      role: rolePipeline
    })

    const sourceOutput = new Artifact();

    const sourceAction = new actions.GitHubSourceAction({
        actionName: 'GitHub_Source',
        owner: 'gabrieltorreswm',
        repo: 'cdk-application-serverless',
        oauthToken: cdk.SecretValue.secretsManager('my-github-token'),
        output: sourceOutput,
        branch: 'master'
      }
    )

    pipeLineCrossAccount.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    const actionDeploy = new actions.CloudFormationCreateUpdateStackAction({
      //account: "937729235844",
      templatePath: sourceOutput.atPath("template.json"),
      adminPermissions: true,
      stackName  : `template-dev`,
      actionName : 'deploy-cross-account',
      region:"us-east-1"
    })

    pipeLineCrossAccount.addStage({
      stageName: "Deploy",
      actions:[actionDeploy]
    })
  }
}
