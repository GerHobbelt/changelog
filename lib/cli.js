"use strict";

var CLI = require('cli');
var FS = require('fs');
var hasColor = require('supports-color');
var changelog = require('./changelog');
var npm = require('./datasrc/npm');
var log = require('./log');
var glob = require('glob');

var changeLogFilePath = function () {
    var l = glob.sync(process.cwd() + '/changelog*', {
        nonull: false,
        nocase: true,
        nodir: true
    }) || [];
    return l[0];
}() || 'CHANGELOG.md';

CLI.setUsage('changelog <npm module name> [release] [options]\n' +
    '  changelog <github repo url> [release] [options]\n' +
    '\n' +
    'Module name:\n' +
    '   $ changelog npm\n' +
    '\n' +
    'Github repo:\n' +
    '   $ changelog github.com/isaacs/npm\n' +
    '   $ changelog isaacs/npm\n' +
    '\n' +
    'Versions:\n' +
    '   latest   Default: Show only the latest versions. ex: $ changelog npm latest\n' +
    '   all      Show all versions.                      ex: $ changelog npm all\n' +
    '   number   Show that many recent versions.         ex: $ changelog npm 3\n' +
    '   n.n.n    Show changes for a specific version.    ex: $ changelog npm 1.3.11'

).parse({
    color:      ['c', 'Output as Color (terminal default)'],
    markdown:   ['m', 'Output as Github-flavored Markdown (file default)'],
    json:       ['j', 'Output as JSON'],
    debug:      ['d', 'Enable debugging'],
    append:     ['a', 'Append to file: ' + changeLogFilePath],
});

CLI.main(function (args, options) {
    log.enableDebug(options.debug);

    var repoUrl;
    var project = args[0];

    var releaseRequested = args[1] || 'latest';

    if (project === 'all') {
        releaseRequested = 'all';
        project = null;
    }

    if (project === 'latest') {
        releaseRequested = 'latest';
        project = null;
    }

    if (!isNaN(parseInt(project, 10))) {
        releaseRequested = parseInt(project, 10);
        project = null;
        log.debug('project: this one');
        log.debug('releaseRequested: ' + releaseRequested);
    }

    if (!isNaN(parseInt(project, 10))) {
        releaseRequested = parseInt(releaseRequested, 10);
        log.debug('releaseRequested: ' + releaseRequested);
    }

    if (!project) {
        try {
            log.debug('Project not specified. Looking for a package.json in ' + process.cwd() + ' instead.');
            var packageInfo = JSON.parse(FS.readFileSync(process.cwd() + '/package.json').toString());
            project = packageInfo.name;
            repoUrl = npm.findRepoUrl(packageInfo);
        } catch (e) {
            log.debug('Package.json not found');
        }
    }

    function generateOutput(data) {
        var fn = options.json ? JSON.stringify
            : options.markdown ? changelog.markdown
            : hasColor ? changelog.terminal
            : changelog.markdown;
        return fn(data);
    }

    function dump(data) {
        if (options.append) {
            var content = '';
            if (FS.existsSync(changeLogFilePath)) {
                content = FS.readFileSync(changeLogFilePath, 'utf8');
            }
            // Append new log data to the **top** of the file:
            content = data + '\n\n' + content;
            FS.writeFileSync(changeLogFilePath, content, 'utf8');
            console.info(changeLogFilePath + ' has been appended.');
        } else {
            console.info(data);
        }
    }

    log.debug("changelog.generate", { project: project, repoUrl: repoUrl, releaseRequested: releaseRequested });
    changelog.generate(project, repoUrl, releaseRequested)
        .then(generateOutput)
        .then(dump)
        .catch(function(err) {
            if (typeof err === 'string') {
                log.error(err);
            } else {
                throw err;
            }
        })
        .done();
});
