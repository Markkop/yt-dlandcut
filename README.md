# :vhs: Youtube - Download and Cut

![Repo status](https://www.repostatus.org/badges/latest/active.svg)
[![Build Status](https://travis-ci.com/Markkop/yt-dlandcut.svg?branch=master)](https://travis-ci.com/Markkop/yt-dlandcut)
![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)

## What it is

This app downloads youtube videos using youtube-dl and cuts them with ffmpeg given starting and ending times.  
Currently only Windows e Linux platforms are supported.

## How to use

Download the binary according to your OS:

- Linux
- Windows

## How to develop

Clone this repository and run `yarn` to install dependencies.  
Make sure to have `node` and `npm` installed.

## How to deploy/release

It looks like `electron-builder` already does a lot when [releasing](https://www.electron.build/configuration/publish) a new version of an Electron app to github.

The first option to build and release this project's binaries is by running the `package.json` script command `yarn release`.  
Electron Builder will know that it should also deploy when building because of this script command name `release` and it will look for a `GH_TOKEN` environment variable to publish to GitHub as a draft release with the package version.
You can set this environment variable by adding `export GH_TOKEN=CHANGE_THIS` to `~/.zshrc` or `~/.bashrc` file and sourcing it with `source ~./zshrc` after [creating a token](https://github.com/settings/tokens/new).

However, the [recommend way](https://www.electron.build/configuration/publish#recommended-github-releases-workflow) is by using a Continuous Integration service, [TravisCI](https://travis-ci.com/) in this case.
First, a collaborator have to [draft a new release](https://help.github.com/articles/creating-releases/) with the `package.json` version. Then, after every push, TravisCI will run `yarn release`, building the files and providing them as assets in the drafted Github's release.

For this to happen, it's required to have `"build": { "publish": "github" }` in `package.json` and `GH_TOKEN` as environment variable inside TravisCI dashboard's build settings.  
Then after a passing build, a collaborator can simply publish it.
The current `.travis.yml` is similar to this [sample](https://www.electron.build/multi-platform-build#sample-travisyml-to-build-electron-app-for-macos-linux-and-windows).

It's also possible to deploy using [provider: releases](https://docs.travis-ci.com/user/deployment/releases/) TravisCI deploy configuration, which has some examples [here](https://github.com/lane-c-wagner/electron-ci-boilerplate/blob/master/.travis.yml) and [here](https://github.com/gontarczyk-artur/electron-travis-poc/blob/master/.travis.yml).

## Options

- Youtube url (required)
  Can be a shortened version or a normal one

- Starting and ending times (required)
  In the HH:MM:SS format. It can't be longer than 24h

- Convert to mp3
  It converts the same output to mp3
