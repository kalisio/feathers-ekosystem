#!/usr/bin/env bash
set -euo pipefail
# set -x

THIS_FILE=$(readlink -f "${BASH_SOURCE[0]}")
THIS_DIR=$(dirname "$THIS_FILE")
ROOT_DIR=$(dirname "$THIS_DIR")
WORKSPACE_DIR="$(dirname "$ROOT_DIR")"

. "$THIS_DIR/kash/kash.sh"

slack_report() {
    slack_ci_report "$ROOT_DIR" "$CI_STEP_NAME" "$KASH_EXIT_CODE" "$SLACK_WEBHOOK_DOCS"
}

## Parse options
##

NODE_VER=20
PUBLISH=false
CI_STEP_NAME="Build docs"
while getopts "n:pr:" OPT; do
    case $OPT in
        n) # defines node version
            NODE_VER=$OPTARG
             ;;
        p) # publish doc
            PUBLISH=true
            ;;
        r) # report outcome to slack
            CI_STEP_NAME=$OPTARG
            load_env_files "$WORKSPACE_DIR/development/common/SLACK_WEBHOOK_DOCS.enc.env"
            add_function_to_trap slack_report
            ;;
        *)
            ;;
    esac
done

## Build docs
##

use_node "$NODE_VER"
build_docs "$ROOT_DIR" "kalisio/feathers-ekosystem" "$PUBLISH"

