## Description
This package installs a command that pulls secrets from a given EC2 task definition file, with values defined as AWS SSM parameter ARNs, and transcribes the ARNs to their actual SSM values.
It will then print the secret values to the screen, or save them to a file, in normal ENV=var format.

### Inspiration:
It was created to solve the annoyance of having to manually go through the definition file secrets and looking up each value, which sometimes has to happen when joining a new project that doesn't have a full version of the env variables elsewhere.

I couldn't find another straightforward way to do this, so I had our good friend ChatGPT whip this up for me.  If anyone knows if there is a way to actually do this through AWS utils or otherwise, please open an issue or email me at rw3iss@gmail.com.

## Install:
`npm i -g ecs-secrets` (global)

`npm i ecs-secrets` (local project)

## Usage

Run against a task definition file, and ensure the AWS SSM credentials are set, ie:

`ecs-secrets task-def.json -r <region> -i <access-key-id> -s <access-key-secret>`


## Setting Credentials:
AWS credentials are read in order of precedence: command line > AWS credentials file > ENV vars

If a local .env file exists, it will read it. You can specify an environment-specific .env file to use by setting NODE_ENV. ie. NODE_ENV=development will try to read .env.development.

If using ENV vars, these should be defined:
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_PROFILE (optional, if using a credentials file)
```

## Command-line Options:

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


## Development (todo):
```
npm i
npm run build
npm i -g
```