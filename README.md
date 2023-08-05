# <img alt="Demo PrintsCreen" src="public/256x256.png" width="26"> Youtube - Download and Cut

![https://img.shields.io/badge/repo%20status-maintenance-yellow](https://img.shields.io/badge/repo%20status-maintenance-yellow)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/markkop/yt-dlandcut)

<kbd>
  <img border="1" alt="Demo PrintsCreen" src="https://i.imgur.com/hx48SzZ.gif" >
</kbd>

## About

This is one of my first side projects as a developer from a few years ago.  
The goal was to make it easy for people to download and cut Youtube videos so they could share them.  
**Since it depends on libraries that get videos from YouTube, this software may stop working at any time.**  
If that happens, let me know so I can look and see if I can fix it.

## Usage

* Download the [latest release](https://github.com/Markkop/yt-dlandcut/releases/latest) for Linux (**.appImage**), Windows (**.exe**) or MacOS (**.dmg**) at the [releases](https://github.com/Markkop/yt-dlandcut/releases/) page.  
* You might need to manually bypass security warnings that might appear from your OS (the app is safe, check the code it want to make sure)
* The first time you run this app, it will download the `ffmpeg` file according to your OS.  
* Once completed, you will find a folder called `yt-dlandcut` within your home folder containing the downloaded and converted files.
If you have any problem, please [let me know](https://twitter.com/heymarkkop).

## Options

- **Youtube url\***: normal or shortened url
- **Starting and ending times\***: in HH:MM:SS format
- **Convert to mp3**: if the cut should also be converted to audio
- **Download again**: to not skip download if file exists
- **Open on finish**: opens cut video/audio
- **Custom file name**: instead of video's title

## Development

Make sure to have `node` and `yarn` installed.  
Run `yarn` to install dependencies and `yarn start` to transpile and run the code.  
To create a package based on your current operating system and build options in `package.json`, simply run `yarn build`. The resulting package will be located in the `dist` folder.

## Deploy/Release

It looks like `electron-builder` already does a lot when [releasing](https://www.electron.build/configuration/publish) a new version of an Electron app to github.

The first option to build and release this project's binaries is by running the `package.json` script command `yarn release`.  
Electron Builder will know that it should also deploy after building because of this script command name `release` and it will look for a `GH_TOKEN` environment variable to publish to GitHub as a draft release with the package version.
You can set this environment variable by adding `export GH_TOKEN=CHANGE_THIS` to `~/.zshrc` or `~/.bashrc` file and sourcing it with `source ~./zshrc` after [creating a token](https://github.com/settings/tokens/new).

However, the [recommend way](https://www.electron.build/configuration/publish#recommended-github-releases-workflow) is by using a Continuous Integration service, Github Actions in this case.
First, a collaborator have to [draft a new release](https://help.github.com/articles/creating-releases/) with the `package.json` version. Then, after every push, GH Actions will run `yarn build`, building the files and providing them as assets in the drafted Github's release.

For this to happen, it's required to have `"build": { "publish": "github" }` in `package.json` and `GH_TOKEN` as environment variable inside TravisCI dashboard's build settings.  
Then after a passing build, a collaborator can simply publish it.  

It's also possible to deploy using [provider: releases](https://docs.travis-ci.com/user/deployment/releases/) deploy configuration.  
Here are some examples for Travis: [this](https://github.com/lane-c-wagner/electron-ci-boilerplate/blob/master/.travis.yml) and [this](https://github.com/gontarczyk-artur/electron-travis-poc/blob/master/.travis.yml).

Note: I used to used TravisCI, but ended up converting the yml to Github Action using ChatGPT.

### TL;DR:

- Create a draft release on GitHub
- Run the `yarn release` command and ensure that the GH_TOKEN environment variable is exported to the current shell.
- Or you can have Github Action deploy it automatically when you push a commit.
