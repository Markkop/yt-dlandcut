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

## Options

- Youtube url (required)
  Can be a shortened version or a normal one

- Starting and ending times (required)
  In the HH:MM:SS format. It can't be longer than 24h

- Convert to mp3
  It converts the same output to mp3
