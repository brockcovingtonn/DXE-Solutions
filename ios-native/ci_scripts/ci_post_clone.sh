#!/bin/sh
set -e

# Xcode Cloud runs this right after cloning, before the archive step.
# $CI_BUILD_NUMBER is a fresh, always-increasing number Xcode Cloud
# assigns to every run — using it as CURRENT_PROJECT_VERSION guarantees
# each upload's bundle version is higher than the last, which App Store
# Connect requires. Without this, the static CURRENT_PROJECT_VERSION
# checked into project.yml never changes between builds, so any build
# after the first successful upload fails with "The bundle version must
# be higher than the previously uploaded version."
#
# Requires VERSIONING_SYSTEM: apple-generic on the target (set in
# project.yml) — agvtool refuses to run without it.
if [ -n "$CI_BUILD_NUMBER" ]; then
  cd "$CI_PRIMARY_REPOSITORY_PATH/ios-native"
  xcrun agvtool new-version -all "$CI_BUILD_NUMBER"
fi
