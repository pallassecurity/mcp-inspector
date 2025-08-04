interface MethodExposer {
  exposesMethods: string[];
}

interface MethodConflict {
  methodName: string;
  conflictingClasses: string[];
}

interface PallasServiceConfig {
  throwOnConflicts?: boolean;
  allowMethodOverride?: boolean;
}

type ExtractMethods<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? T[K] : never;
};

type PickExposedMethods<T, K extends keyof T> = Pick<ExtractMethods<T>, K>;

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

class PallasServiceBase {
  private readonly _childInstances = new Map<string, MethodExposer>();
  private readonly _exposedMethods = new Map<
    string,
    { instance: MethodExposer; methodName: string; className: string }
  >();
  private readonly _config: Required<PallasServiceConfig>;

  constructor(config: PallasServiceConfig = {}) {
    this._config = {
      throwOnConflicts: config.throwOnConflicts ?? false,
      allowMethodOverride: config.allowMethodOverride ?? false,
    };
  }

  public registerChild<
    T extends MethodExposer,
    K extends keyof T = Extract<keyof T, T["exposesMethods"][number]>,
  >(
    instance: T,
    className?: string,
  ): asserts this is this & PickExposedMethods<T, K> {
    const resolvedClassName = className ?? instance.constructor.name;

    if (this._childInstances.has(resolvedClassName)) {
      const message = `Child class '${resolvedClassName}' is already registered`;
      console.warn(message);

      if (this._config.throwOnConflicts) {
        throw new Error(message);
      }
      return;
    }

    this._childInstances.set(resolvedClassName, instance);

    const exposedMethods: string[] = instance.exposesMethods || [];

    if (exposedMethods.length === 0) {
      console.info(`No methods exposed by class '${resolvedClassName}'`);
      return;
    }

    this._exposeMethodsFromChild(instance, exposedMethods, resolvedClassName);

    console.info(
      `Successfully registered child class '${resolvedClassName}' with ${exposedMethods.length} exposed methods`,
      { exposedMethods },
    );
  }

  public unregisterChild(className: string): boolean {
    if (!this._childInstances.has(className)) {
      console.warn(
        `Attempted to unregister non-existent child class '${className}'`,
      );
      return false;
    }

    const methodsToRemove: string[] = [];
    for (const [methodName, methodInfo] of this._exposedMethods.entries()) {
      if (methodInfo.className === className) {
        methodsToRemove.push(methodName);
      }
    }

    for (const methodName of methodsToRemove) {
      this._exposedMethods.delete(methodName);
      delete (this as Record<string, unknown>)[methodName];
    }

    this._childInstances.delete(className);

    console.info(
      `Unregistered child class '${className}' and removed ${methodsToRemove.length} methods`,
      { removedMethods: methodsToRemove },
    );

    return true;
  }

  public getRegisteredChildren(): Record<string, { exposedMethods: string[] }> {
    const result: Record<string, { exposedMethods: string[] }> = {};

    for (const [className] of this._childInstances) {
      const exposedMethods: string[] = [];
      for (const [methodName, methodInfo] of this._exposedMethods.entries()) {
        if (methodInfo.className === className) {
          exposedMethods.push(methodName);
        }
      }
      result[className] = { exposedMethods };
    }

    return result;
  }

  public getMethodConflicts(): MethodConflict[] {
    const methodCounts = new Map<string, string[]>();

    for (const [methodName, methodInfo] of this._exposedMethods.entries()) {
      if (!methodCounts.has(methodName)) {
        methodCounts.set(methodName, []);
      }
      methodCounts.get(methodName)!.push(methodInfo.className);
    }

    return Array.from(methodCounts.entries())
      .filter(([, classes]) => classes.length > 1)
      .map(([methodName, conflictingClasses]) => ({
        methodName,
        conflictingClasses,
      }));
  }

  private _exposeMethodsFromChild(
    instance: MethodExposer,
    exposedMethods: string[],
    className: string,
  ): void {
    const conflicts: string[] = [];

    for (const methodName of exposedMethods) {
      if (typeof (instance as Record<string, unknown>)[methodName] !== "function") {
        console.error(
          `Method '${methodName}' not found on class '${className}' or is not a function`,
        );
        continue;
      }

      if (this._exposedMethods.has(methodName)) {
        const existingMethod = this._exposedMethods.get(methodName)!;
        conflicts.push(methodName);

        console.warn(
          `Method name conflict: '${methodName}' is already exposed by class '${existingMethod.className}'`,
          {
            existingClass: existingMethod.className,
            newClass: className,
          },
        );

        if (!this._config.allowMethodOverride) {
          continue;
        }
      }

      if (
        methodName in this &&
        typeof (this as Record<string, unknown>)[methodName] === "function"
      ) {
        console.warn(
          `Method name conflict: '${methodName}' conflicts with PallasService's built-in method`,
          { className },
        );

        if (!this._config.allowMethodOverride) {
          continue;
        }
      }

      (this as Record<string, unknown>)[methodName] = (instance as Record<string, unknown>)[methodName].bind(instance);
      this._exposedMethods.set(methodName, {
        instance,
        methodName,
        className,
      });
    }

    if (conflicts.length > 0 && this._config.throwOnConflicts) {
      throw new Error(
        `Method name conflicts detected for class '${className}': ${conflicts.join(", ")}`,
      );
    }
  }
}

class PallasService extends PallasServiceBase {
  public withChild<
    T extends MethodExposer,
    K extends keyof T = Extract<keyof T, T["exposesMethods"][number]>,
  >(instance: T, className?: string): PallasService & PickExposedMethods<T, K> {
    this.registerChild(instance, className);
    return this as PallasService & PickExposedMethods<T, K>;
  }

  public static create<T extends MethodExposer[]>(
    ...children: T
  ): PallasService &
    UnionToIntersection<
      {
        [K in keyof T]: T[K] extends MethodExposer
          ? PickExposedMethods<
              T[K],
              Extract<keyof T[K], T[K]["exposesMethods"][number]>
            >
          : never;
      }[number]
    > {
    const service: PallasService = new PallasService();

    for (const child of children) {
      service.registerChild(child);
    }

    return service as PallasService &
      UnionToIntersection<
        {
          [K in keyof T]: T[K] extends MethodExposer
            ? PickExposedMethods<
                T[K],
                Extract<keyof T[K], T[K]["exposesMethods"][number]>
              >
            : never;
        }[number]
      >;
  }
}

class PallasTool {
  private fullName: string;
  private server: string;
  private toolName: string;
  private args: unknown;

  constructor({
    server,
    toolName,
    args,
    delimiter = "-",
  }: {
    server: string;
    toolName: string;
    args: unknown;
    delimiter?: string;
  }) {
    this.server = server;
    this.toolName = toolName;
    this.fullName = [this.server, delimiter, this.toolName].join("");
    this.args = args;
  }

  get name(): string {
    return this.fullName;
  }

  get arguments(): unknown {
    return this.args;
  }

  isSameTool(fullString: string): boolean {
    return fullString === this.fullName;
  }

  isSameServerAndTool(server: string, tool: string): boolean {
    return server === this.server && tool === this.toolName;
  }

  getToStorage() {
    const data = {
      name: this.fullName,
      arguments: this.arguments,
    };
    console.log(data);
    return data;
  }

  static fromNotionCSV(row: Record<string, string>): PallasTool {
    const KEY_SERVER_NAME = "server";
    const KEY_TOOL_NAME = "tool";
    const KEY_ARGUMENTS = "request_args";

    const server = row[KEY_SERVER_NAME];
    const toolName = row[KEY_TOOL_NAME];
    const argsString = row[KEY_ARGUMENTS];

    if (!server) {
      throw new Error(`Missing required field: ${KEY_SERVER_NAME}`);
    }
    if (!toolName) {
      throw new Error(`Missing required field: ${KEY_TOOL_NAME}`);
    }
    if (!argsString) {
      throw new Error(`Missing required field: ${KEY_ARGUMENTS}`);
    }

    return new PallasTool({
      server,
      toolName,
      args: JSON.parse(argsString),
    });
  }
}

export type { 
  MethodExposer, 
  MethodConflict, 
  PallasServiceConfig,
  ExtractMethods,
  PickExposedMethods,
  UnionToIntersection
};

export { PallasService, PallasServiceBase, PallasTool };