## Description
This package installs a command that pulls secrets from a given EC2 task definition file, with values defined as AWS SSM parameter ARNs, and transcribes the ARNs to their actual SSM values.
It will then print the secret values to the screen, or save them to a file, in normal ENV=var format.

### Inspiration:
It was created to solve the annoyance of having to manually go through the definition file secrets and having to look up each value. It is convenient when joining a new project that doesn't have a full version of the env variables locally.
I couldn't find another straightforward way to do this, so I had our good friend ChatGPT whip this up for me.  If anyone knows if there is a way to actually do this through AWS utils, please open an issue or email me at rw3iss@gmail.com 😄

## Install:
`npm i -g ecs-secrets` (global)

`npm i ecs-secrets` (local project)

Ensure the npm bin directory is in your environment PATH. Find the npm bin dir with:
```
whereis node
npm root -g
```
ie:
```
EXPORT PATH=$PATH:/home/rw3iss/.nvm/versions/node/v22.18.0/bin/
```

## Usage

Run it in against a task definition file, ie:
```
ecs-secrets dev-task-definition.json -r us-east-2 -i <aws-access-key-id> -a <aws-access-key-secret> -o .env.development
✅ Wrote 14 secrets to .env.development
```


### How it works:
AWS credentials for the operation are read from, in order of precendence, the command line, or an AWS credentials file, or ENV vars.

If a local .env file exists, it will read it. You can have it read an environment-specific .env (ie. .env.development) by setting NODE_ENV before running the command.

If using ENV vars, these should be defined:
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION      (region where SSM is)
AWS_PROFILE     (optional, if using a credentials file)
```


## Command-line options:

```
      --version       Show version number                              [boolean]
  -t, --task          Task definition file path              [string] [required]
  -r, --region        AWS region                                        [string]
  -i, --accessId      AWS access key ID                                 [string]
  -a, --accessKey     AWS secret access key                             [string]
  -s, --sessionToken  AWS session token (optional)                      [string]
  -p, --profile       AWS profile name from shared credentials          [string]
  -o, --output        Optional output file path                         [string]
  -d, --decrypt       Decrypt secure string parameters[boolean] [default: false]
      --help          Show help                                        [boolean]
```


## Development:
```
npm i
npm run build
npm i -g
```