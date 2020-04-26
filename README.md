# <img alt="Demo PrintsCreen" src="public/256x256.png" width="26"> Youtube - Download and Cut

![Repo status](https://www.repostatus.org/badges/latest/active.svg)
[![Build Status](https://travis-ci.com/Markkop/yt-dlandcut.svg?branch=master)](https://travis-ci.com/Markkop/yt-dlandcut)
![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)

<kbd>
  <img border="1" alt="Demo PrintsCreen" src="https://i.imgur.com/ZnELY8o.gif" >
</kbd>

## About

This app **downloads** youtube videos using [youtube-dl](https://youtube-dl.org/) and **cuts** them with [ffmpeg](https://www.ffmpeg.org/) given starting and ending times.  
Currently it only supports **Windows** e **Linux**.

## Usage

Download the [latest release](https://github.com/Markkop/yt-dlandcut/releases/latest) for Linux (**.appImage**) or Windows (**.exe**) at the [releases](https://github.com/Markkop/yt-dlandcut/releases/) page.
The first time you run this app (or if required `binaries` are not found), the app will download youtube-dl and ffmpeg files according to your OS.  
Currently they're being download from [youtube-dl](https://github.com/ytdl-org/youtube-dl/releases/latest) and [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static/releases/latest) latest releases.  
After finishing, a folder inside your home folder named `yt-dlandcut` will contain the files.
If you run into any problem, please [let me know](https://twitter.com/heymarkkop).

## Options

- **Youtube url\***: normal or shortened url
- **Starting and ending times\***: in HH:MM:SS format
- **Convert to mp3**: if the cut should also be converted to audio
- **Download again**: to not skip download if file exists
- **Open on finish**: opens cut video/audio
- **Custom file name**: instead of video's title

## Development

Make sure to have `node` and `npm` installed.
Run `yarn` to install dependencies and `yarn start` to transpile and run the code.
By running `yarn build`, electron-builder will build a package inside `dist` folder according to your current operational system and following `build` options on `package.json`

## Deploy/Release

It looks like `electron-builder` already does a lot when [releasing](https://www.electron.build/configuration/publish) a new version of an Electron app to github.

The first option to build and release this project's binaries is by running the `package.json` script command `yarn release`.  
Electron Builder will know that it should also deploy after building because of this script command name `release` and it will look for a `GH_TOKEN` environment variable to publish to GitHub as a draft release with the package version.
You can set this environment variable by adding `export GH_TOKEN=CHANGE_THIS` to `~/.zshrc` or `~/.bashrc` file and sourcing it with `source ~./zshrc` after [creating a token](https://github.com/settings/tokens/new).

However, the [recommend way](https://www.electron.build/configuration/publish#recommended-github-releases-workflow) is by using a Continuous Integration service, [TravisCI](https://travis-ci.com/) in this case.
First, a collaborator have to [draft a new release](https://help.github.com/articles/creating-releases/) with the `package.json` version. Then, after every push, TravisCI will run `yarn build`, building the files and providing them as assets in the drafted Github's release.

For this to happen, it's required to have `"build": { "publish": "github" }` in `package.json` and `GH_TOKEN` as environment variable inside TravisCI dashboard's build settings.  
Then after a passing build, a collaborator can simply publish it.  
The current `.travis.yml` is similar to this [sample](https://www.electron.build/multi-platform-build#sample-travisyml-to-build-electron-app-for-macos-linux-and-windows).

It's also possible to deploy using [provider: releases](https://docs.travis-ci.com/user/deployment/releases/) TravisCI deploy configuration.  
Here are some examples: [this](https://github.com/lane-c-wagner/electron-ci-boilerplate/blob/master/.travis.yml) and [this](https://github.com/gontarczyk-artur/electron-travis-poc/blob/master/.travis.yml).
