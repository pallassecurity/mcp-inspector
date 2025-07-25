
interface Config {
}

interface Context {
    csvTestCases?: CSVData

}

type TestDataRaw = {
    tool_name: string,
    request_args: string,
}
interface ExposableConstructor {
  exposedMethods?: string[];
}

interface ExposableInstance {
  constructor: ExposableConstructor;
  [key: string]: any;
}

class PallasService {
    private mapTestCases
    private _children: Record<string, ExposableInstance>;
    constructor(config: Config, ctx: Context = {}) {
        this._children = {
            childA: new TestCasesManager(),
            childB: new TestCasesManager()
        };

        this._bindChildMethods(this._children);
    }
    private _bindChildMethods(children) {
        for (const [name, instance] of Object.entries(children)) {
            const exposed = instance.constructor.exposedMethods || [];

            for (const method of exposed) {
                if (typeof instance[method] === 'function') {
                    if ((this as any)[method]) {
                        console.warn(`Conflict: method ${method} already exists on Service`);
                    }

                    (this as any)[method] = instance[method].bind(instance);
                } else {
                    console.warn(`Warning: ${method} is not a function on ${name}`);
                }
            }
        }
    }

    _processTestCaseFile(csv: TestDataRaw) {

        const map = new Map()

        const headers = csv.headers
        if (!headers)
            return map

        const indexToolName = headers.indexOf("tool_name")
        const indexArguments = headers.indexOf("arguments")

        for (const row in csv.data) {

            map.set(row[indexToolName], row[indexArguments])

        }

        return map

    }

    getTestableList() {
        return this.mapTestCases.entries()
    }


}

class TestCasesManager {

    static exposedMethods = []
    constructor() {}

    run (){
        console.log("run")
    }
}


export { PallasService }
