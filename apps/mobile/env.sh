#!/usr/bin/env bash
# Reproducible Android build environment for the ATAIR mobile apps.
#
# The toolchain lives outside the repo (not committed). Source this file, then
# run `flutter build apk|appbundle --release --dart-define=ATAIR_API_BASE=...`
# from any app directory.
export JAVA_HOME=/workspace/tools/jdk17/jdk-17.0.13+11
export ANDROID_SDK_ROOT=/workspace/tools/android-sdk
export ANDROID_HOME=/workspace/tools/android-sdk
export PATH="$JAVA_HOME/bin:/workspace/tools/flutter/bin:$PATH"
export PUB_CACHE=/workspace/tools/pubcache
