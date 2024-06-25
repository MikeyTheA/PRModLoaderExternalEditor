declare const log: (message: String) => void;
declare const error: (message: String) => void;
declare const ImGui: any;
declare const hook: (phase: String, func: Function) => void;
declare const addWindow: (name: String, show: Function, flags: any) => void;
declare const getBattleScene: () => PokeRogue.BattleScene;

declare const globalData: {
    constructor(prefix?: String);
    getData(key: String, init: any, persistent?: Boolean): any;
    setData(key: String, value: any, persistent?: Boolean): void;
    getAccess(key: String, init: any, persistent?: Boolean): (value?: any) => any;
    addListener(key: String, init: any, listener: Function, persistent?: Boolean, identifier?: String): void;
}

declare const data: {
    constructor(prefix?: String);
    getData(key: String, init: any, persistent?: Boolean = false): any;
    setData(key: String, value: any, persistent?: Boolean): void;
    getAccess(key: String, init: any, persistent?: Boolean): (value?: any) => any;
    addListener(key: String, init: any, listener: Function, persistent?: Boolean, identifier?: String): void;
}

declare const getInstalledMods: () => Array<{
    name: string,
    version: number,
    author: string
}>

