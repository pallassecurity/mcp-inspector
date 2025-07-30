/**
 * Contract for child classes that expose methods to PallasService
 */
interface MethodExposer {
  /**
   * Method names available for exposure to parent service
   */
  exposesMethods: string[];
}

/**
 * Represents a method name conflict between classes
 */
interface MethodConflict {
  methodName: string;
  conflictingClasses: string[];
}

/**
 * Logging contract for service operations
 */
interface Logger {
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
}

/**
 * Configuration options for PallasService behavior
 */
interface PallasServiceConfig {
  logger?: Logger;
  throwOnConflicts?: boolean;
  allowMethodOverride?: boolean;
}

/**
 * Extracts only method signatures from a class type
 */
type ExtractMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? T[K] : never;
};

/**
 * Selects only the exposed methods from a class type
 */
type PickExposedMethods<T, K extends keyof T> = Pick<ExtractMethods<T>, K>;

/**
 * Converts union types to intersection types
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/**
 * Default console-based logger implementation
 */
class ConsoleLogger implements Logger {
  warn(message: string, context?: Record<string, any>): void {
    console.warn(message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    console.error(message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    console.info(message, context);
  }
}

/**
 * Base service class for method composition and child management
 */
class PallasServiceBase {
  private readonly _childInstances = new Map<string, any>();
  private readonly _exposedMethods = new Map<
    string,
    { instance: any; methodName: string; className: string }
  >();
  private readonly _logger: Logger;
  private readonly _config: Required<PallasServiceConfig>;

  constructor(config: PallasServiceConfig = {}) {
    this._config = {
      logger: config.logger ?? new ConsoleLogger(),
      throwOnConflicts: config.throwOnConflicts ?? false,
      allowMethodOverride: config.allowMethodOverride ?? false,
    };
    this._logger = this._config.logger;
  }

  /**
   * Registers a child class instance and exposes its designated methods
   */
  public registerChild<
    T extends MethodExposer,
    K extends keyof T = Extract<keyof T, (typeof T)["exposesMethods"][number]>,
  >(
    instance: T,
    className?: string,
  ): asserts this is this & PickExposedMethods<T, K> {
    const resolvedClassName = className ?? instance.constructor.name;

    if (this._childInstances.has(resolvedClassName)) {
      const message = `Child class '${resolvedClassName}' is already registered`;
      this._logger.warn(message);

      if (this._config.throwOnConflicts) {
        throw new Error(message);
      }
      return;
    }

    this._childInstances.set(resolvedClassName, instance);

    const constructor = instance.constructor as any;
    const exposedMethods: string[] = constructor.exposesMethods || [];

    if (exposedMethods.length === 0) {
      this._logger.info(`No methods exposed by class '${resolvedClassName}'`);
      return;
    }

    this._exposeMethodsFromChild(instance, exposedMethods, resolvedClassName);

    this._logger.info(
      `Successfully registered child class '${resolvedClassName}' with ${exposedMethods.length} exposed methods`,
      { exposedMethods },
    );
  }

  /**
   * Removes a child class and cleans up its exposed methods
   */
  public unregisterChild(className: string): boolean {
    if (!this._childInstances.has(className)) {
      this._logger.warn(
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
      delete (this as any)[methodName];
    }

    this._childInstances.delete(className);

    this._logger.info(
      `Unregistered child class '${className}' and removed ${methodsToRemove.length} methods`,
      { removedMethods: methodsToRemove },
    );

    return true;
  }

  /**
   * Returns metadata about all registered child classes
   */
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

  /**
   * Identifies method name conflicts across registered classes
   */
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

  /**
   * Binds child instance methods to the service with conflict detection
   */
  private _exposeMethodsFromChild(
    instance: any,
    exposedMethods: string[],
    className: string,
  ): void {
    const conflicts: string[] = [];

    for (const methodName of exposedMethods) {
      if (typeof instance[methodName] !== "function") {
        this._logger.error(
          `Method '${methodName}' not found on class '${className}' or is not a function`,
        );
        continue;
      }

      if (this._exposedMethods.has(methodName)) {
        const existingMethod = this._exposedMethods.get(methodName)!;
        conflicts.push(methodName);

        this._logger.warn(
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
        typeof (this as any)[methodName] === "function"
      ) {
        this._logger.warn(
          `Method name conflict: '${methodName}' conflicts with PallasService's built-in method`,
          { className },
        );

        if (!this._config.allowMethodOverride) {
          continue;
        }
      }

      (this as any)[methodName] = instance[methodName].bind(instance);
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

/**
 * Enhanced service class with fluent API for method composition
 */
class PallasService extends PallasServiceBase {
  /**
   * Registers a child and returns a typed service instance
   */
  public withChild<
    T extends MethodExposer,
    K extends keyof T = Extract<keyof T, (typeof T)["exposesMethods"][number]>,
  >(instance: T, className?: string): PallasService & PickExposedMethods<T, K> {
    this.registerChild(instance, className);
    return this as PallasService & PickExposedMethods<T, K>;
  }

  /**
   * Creates a new service instance with multiple children pre-registered
   */
  public static create<T extends MethodExposer[]>(
    ...children: T
  ): PallasService &
    UnionToIntersection<
      {
        [K in keyof T]: T[K] extends MethodExposer
          ? PickExposedMethods<
              T[K],
              Extract<keyof T[K], (typeof T)[K]["exposesMethods"][number]>
            >
          : never;
      }[number]
    > {
    const service = new PallasService();

    for (const child of children) {
      service.registerChild(child);
    }

    return service as any;
  }
}

/**
 * Represents a tool configuration with server and execution context
 */
class PallasTool {
  private fullName: string;
  private server: string;
  private toolName: string;
  private args: any;

  constructor({
    server,
    toolName,
    args,
    delimiter = "-",
  }: {
    server: string;
    toolName: string;
    args: any;
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

  get arguments(): any {
    return this.args;
  }

  /**
   * Checks if the provided string matches this tool's full name
   */
  isSameTool(fullString: string): boolean {
    return fullString === this.fullName;
  }

  /**
   * Checks if server and tool name match this instance
   */
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

  /**
   * Creates a PallasTool instance from CSV row data
   */
  static fromNotionCSV(row: Record<string, string>): PallasTool {
    const KEY_SERVER_NAME = "server";
    const KEY_TOOL_NAME = "tool";
    const KEY_ARGUMENTS = "request_args";

    return new PallasTool({
      server: row[KEY_SERVER_NAME],
      toolName: row[KEY_TOOL_NAME],
      args: JSON.parse(row[KEY_ARGUMENTS]),
    });
  }
}

export { PallasService, PallasServiceBase, PallasTool };
