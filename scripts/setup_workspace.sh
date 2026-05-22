#!/usr/bin/env bash
set -euo pipefail
# set -x

THIS_FILE=$(readlink -f "${BASH_SOURCE[0]}")
THIS_DIR=$(dirname "$THIS_FILE")
ROOT_DIR=$(dirname "$THIS_DIR")
WORKSPACE_DIR="$(dirname "$ROOT_DIR")"

. "$THIS_DIR/kash/kash.sh"

## Parse options
##

begin_group "Setting up workspace ..."

WORKSPACE_REF="${WORKSPACE_TAG:-${WORKSPACE_BRANCH:-}}"

if [ "$CI" != true ]; then
    while getopts "b:t" option; do
        case $option in
            b) # defines branch
                WORKSPACE_BRANCH=$OPTARG;;
            t) # defines tag
                WORKSPACE_TAG=$OPTARG;;
            *)
            ;;
        esac
    done

    shift $((OPTIND-1))
    WORKSPACE_DIR="$1"

    # Clone project in the workspace
    git_shallow_clone "$KALISIO_GITHUB_URL/kalisio/feathers-ekosystem.git" "$WORKSPACE_DIR/feathers-ekosystem" "$WORKSPACE_REF"
fi

setup_lib_workspace "$WORKSPACE_DIR" "$KALISIO_GITHUB_URL/kalisio/development.git"

# Only use kli when requested + on master branch
if [ "$WORKSPACE_REF" = "master" ]; then
    run_kli "$WORKSPACE_DIR" "$WORKSPACE_NODE" "$WORKSPACE_DIR/development/workspaces/libs/feathers-ekosystem/dev/feathers-ekosystem.js"
fi

end_group "Setting up workspace ..."
