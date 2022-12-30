'use strict';

/**
 * `generateObjectSample` generates a sample object with a tree structure.
 */

module.exports.generateObjectSample = ({ depth = 6, branches = 2, leafValue = () => 'foobar', leafs = 32 }) => {
  const sample = {};

  if (depth === 0) {
    for (let leaf = 0; leaf < leafs; leaf++) {
      sample[`leaf-${leaf}`] = leafValue();
    }

    return sample;
  }

  for (let branch = 0; branch < branches; branch++) {
    sample[`branch-${branch}`] = this.generateObjectSample({ branches, depth: depth - 1, leafs });
  }

  return sample;
};

/**
 * `generateObjectSamplePaths` generates a list with all paths contained in a sample generated using `generateObjectSample`.
 */

module.exports.generateObjectSamplePaths = ({ depth = 6, branches = 2, leafs = 32, path = '' }) => {
  let paths = [];

  if (depth === 0) {
    for (let leaf = 0; leaf < leafs; leaf++) {
      paths.push(`${path}.leaf-${leaf}`);
    }

    return paths;
  }

  for (let branch = 0; branch < branches; branch++) {
    const childPathString = path === '' ? `branch-${branch}` : `${path}.branch-${branch}`;
    const childPaths = this.generateObjectSamplePaths({ branches, depth: depth - 1, leafs, path: childPathString });

    paths = paths.concat(childPaths);
  }

  return paths;
};
