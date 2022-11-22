#!/usr/bin/env node

import { SpotterPlugin, Option } from '@spotter-app/core';
import util from 'util';
import { exec } from 'child_process';

const asyncExec: (command: string) => Promise<string> = (command: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { stdout } = await util.promisify(exec)(command);
      resolve(stdout);
    } catch (err: any) {
      if (err.stdout) {
        resolve(err.stdout);
      }

      reject(err);
      return;
    }
  });
};

const FIND_IGNORE = [
  '.local/*',
  '.cache/*',
  '.zplug/*',
  '.zplug',
  '.cargo/*',
  '.nvm',
];

const FIND_PARAMS = "-type d -exec test -e '{}/.git' ';' -print -prune 2>/dev/null";

const SEARCH_FOLDER = '$HOME';

new class ProjectsPlugin extends SpotterPlugin {
  private projects: Option[] = [];
  private rootOption: Option = {
    name: 'Projects',
    onQuery: (query) => {
      if (!query) {
        return this.projects;
      }

      const lowerCaseQuery = query.toLowerCase();
      return this.projects.filter(p => p.name.toLowerCase().includes(lowerCaseQuery));
    }
  };

	constructor() {
		super();
		this.init();
	}

	private async init() {
    this.projects = await this.findProjects();
	}

  private async findProjects(): Promise<Option[]> {
    const request = FIND_IGNORE.reduce((acc, folder, i, array) => {
      const lastFolder = i === array.length - 1;
      return `${acc} -not -path "${SEARCH_FOLDER}/${folder}" ${lastFolder ? FIND_PARAMS : ''}`;
    }, `find ${SEARCH_FOLDER}`);
    const response = await asyncExec(request);
    return response.split('\n').filter(p => !!p).map(p => {
      const nameArr = p.split('/');
      return {
        name: nameArr.splice(-2).join('/'),
        // TODO: support more editors
        action: () => this.openVSCode(p),
      }
    });
  }

  private async openVSCode(path: string): Promise<boolean> {
    asyncExec(`code ${path}`);
    return true;
  }

  public onQuery(query: string): Option[] {
    if (this.rootOption.name.toLowerCase().includes(query.toLowerCase())) {
      return [this.rootOption];
    }

    return [];
  }
}
