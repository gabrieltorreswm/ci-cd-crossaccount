import * as cdk from 'aws-cdk-lib';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import { CompositePrincipal, Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

export class CiCdCrossaccountStack extends cdk.Stack {
  constructor(scope: any, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //The code that defines your stack goes here
    //Pipeline Role definition
    const rolePipeline = new Role(this,"pipeline-role",{
      roleName: "pipeline-role",
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('cloudformation.amazonaws.com'),
        new ServicePrincipal('codepipeline.amazonaws.com'),
        new ServicePrincipal('codebuild.amazonaws.com')
      ) 
    })

    const roleCodeBuild = new Role(this,"codebuild-role",{
      roleName: "codebuild-role",
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('cloudformation.amazonaws.com'),
        new ServicePrincipal('codepipeline.amazonaws.com'),
        new ServicePrincipal('codebuild.amazonaws.com')
      ) 
    })

    roleCodeBuild.addToPolicy(
       new PolicyStatement(
       {
        effect: Effect.ALLOW,
        actions: [
          "iam:*",
          "secretmanager:*",
          "sts:*",
          "ssm:*",
          "kms:*",
          "s3:*",
          "cloudformation:*",
          "ecr:*"
        ], 
        resources:["*"]
       }
       )
    )

    rolePipeline.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "sts:AssumeRole"
        ],
        resources:["*"]
      })
    )
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
        oauthToken: cdk.SecretValue.secretsManager('cdk-application-serverless-github',{
          jsonField: "token"
        }),
        output: sourceOutput,
        branch: 'master'
      }
    )

    pipeLineCrossAccount.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    // This where are going to build the cdk via command using codeBuild

    const codeBuildCdk = new codebuild.Project(this,`code-build-cdk`,{
      projectName: "code-build-cdk",
      environment:{
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true
      },
      role: roleCodeBuild,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands:  ['npm install -g aws-cdk','npm install -g cdk-assets'],
          },
          build: {
            commands:  [
              'npm install',
              `npx cdk synth`,
              `cdk-assets -p cdk.out/cdk-application-serverless.assets.json publish`
            ],
          },
        },
        "artifacts": {
          "base-directory": "cdk.out",
          "files": "**/*"
        }
      }),
    })

    const cdkbuildOutPut= new Artifact()

    const cdkBuildAction = new actions.CodeBuildAction({
      actionName:"cdk-syth",
      project: codeBuildCdk,
      input : sourceOutput,
      outputs: [cdkbuildOutPut]
    })

    pipeLineCrossAccount.addStage({
      stageName: "Build",
      actions:[cdkBuildAction]
    })

    const actionDeploy = new actions.CloudFormationCreateUpdateStackAction({
      //account: "937729235844",
      templatePath: cdkbuildOutPut.atPath("cdk-application-serverless.template.json"),
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
