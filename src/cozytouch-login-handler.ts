import { PlatformLoginHandler } from "./platform-login-handler";
import axios from 'axios';

export class CozytouchLoginHandler implements PlatformLoginHandler {

    private static clientId = "czduc0RZZXdWbjVGbVV4UmlYN1pVSUM3ZFI4YTphSDEzOXZmbzA1ZGdqeDJkSFVSQkFTbmhCRW9h";
    private static baseURL = "https://api.groupe-atlantic.com";

    readonly user: string;
    readonly password: string;

    constructor(user: string, password: string) {
        this.user = user;
        this.password = password;
    }

    private async getAccessToken(): Promise<string> {
        const formParams = new URLSearchParams(
            {
                grant_type: 'password',
                username: this.user,
                password: this.password
            });
        const res = await axios({
            method: 'post',
            url: `${CozytouchLoginHandler.baseURL}/token`,
            data: formParams,
            headers: {
                Authorization: `Basic ${CozytouchLoginHandler.clientId}`
            }
        });
        const json = res.data;
        if (typeof json.access_token !== 'string') {
            throw new Error("No access token retrieves check your credentials");
        }
        return json.access_token;
    }

    private async getJWT(accessToken: string): Promise<string> {
        const res = await axios({
            method: 'get',
            url: `${CozytouchLoginHandler.baseURL}/gacoma/gacomawcfservice/accounts/jwt`,
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
        });
        const jwt = res.data.toString();
        if (!jwt || jwt.length === 0) {
            throw new Error("No jwt retrieves check your credentials");
        }
        return jwt.slice(1, jwt.length - 1);
    }

    public async getLoginData(): Promise<{ [p: string]: any }> {
        const accessToken = await this.getAccessToken();
        const jwt = await this.getJWT(accessToken);
        return { jwt };
    }
}
