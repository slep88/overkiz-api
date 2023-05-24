import { APIObject, RAWObject } from './object';
import { RAWSetup, Setup } from './setup';
import { Execution, Task } from './execution';
import { EventListener, PollingInfo } from './event-listener';
import { PlatformLoginHandler } from "./platform-login-handler";
import axios from 'axios';

export interface Config {
    readonly host: string;
    readonly polling: PollingInfo;
    readonly platformLoginHandler: PlatformLoginHandler;
}

export class API {

    readonly host: string;
    readonly platformLoginHandler: PlatformLoginHandler;
    readonly eventListener: EventListener;
    private cookies?: string[];

    constructor(config: Config) {
        this.host = config.host;
        this.platformLoginHandler = config.platformLoginHandler;
        this.eventListener = new EventListener(config.polling, this);
    }

    private getBaseURL(): string {
        return `https://${this.host}`;
    }

    public getURL(path: string): string {
        return `${this.getBaseURL()}/enduser-mobile-web/enduserAPI/${path}`;
    }

    public async get(path: string, data?: any): Promise<any> {
        return this.req('get', path, data);
    }

    public async post(path: string, data?: any): Promise<any> {
        return this.req('post', path, data);
    }

    public async delete(path: string, data?: any): Promise<any> {
        return this.req('delete', path, data);
    }

    public async getObjects(): Promise<APIObject[]> {
        const raw: RAWObject[] = await this.get('setup/devices');
        if (Array.isArray(raw)) {
            return raw.map((obj) => new APIObject(obj, this));
        }
        return [];
    }

    public async exec(execution: Execution): Promise<Task | undefined> {
        const res = await this.post('exec/apply', execution);
        if (res.execId !== undefined) {
            return new Task(execution, res.execId, this);
        }
        return undefined;
    }

    public async getSetup(): Promise<Setup> {
        const raw: RAWSetup = await this.get('setup');
        return new Setup(raw, this);
    }

    private async req(method: string, path: string, data?: any): Promise<any> {
        if (this.cookies === undefined) {
            await this.ensureLogin();
        }
        if (this.cookies !== undefined) {
            try {
                const res = await axios({
                    method,
                    data,
                    url: this.getURL(path),
                    headers: {
                        cookie: this.cookies.join(';')
                    }
                });
                return res.data;
            } catch (err) {
                if (err.response?.status === 401) {
                    this.cookies = undefined;
                    return await this.req(method, path, data);
                }
                throw err;
            }
        }
    }

    private async ensureLogin(): Promise<void> {
        let retries = 0;
        let res = undefined;
        do {
            try {
                const overkizLoginData = await this.platformLoginHandler.getLoginData();
                res = await axios({
                    method: 'post',
                    url: this.getURL('login'),
                    data: new URLSearchParams(overkizLoginData)
                });
            } catch (err) {
                if (retries < 3) {
                    retries++;
                } else {
                    throw err;
                }
            }
        } while (res === undefined);
        const json = res.data;
        if (json.success === true) {
            this.cookies = res.headers['set-cookie']?.map((entry: string) => {
                const parts = entry.split(';');
                const cookiePart = parts[0];
                return cookiePart;
            });
        } else if (json.error !== undefined) {
            throw res.error;
        }
    }
}
