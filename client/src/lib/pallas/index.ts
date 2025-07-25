/**
 * Interface for child classes that expose methods to PallasService
 */
interface IMethodExposer {
  /**
   * Static property containing method names to expose to parent service
   */
  exposesMethods: string[];
}

/**
 * Interface for method conflict information
 */
interface IMethodConflict {
  methodName: string;
  conflictingClasses: string[];
}

/**
 * Logger interface for dependency injection
 */
interface ILogger {
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
}

/**
 * Default console logger implementation
 */
class ConsoleLogger implements ILogger {
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
 * Type helper to extract method signatures from a class
 */
type ExtractMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? T[K] : never;
};

/**
 * Type helper to pick only the exposed methods from a class
 */
type PickExposedMethods<T, K extends keyof T> = Pick<ExtractMethods<T>, K>;

/**
 * Example TestCaseManager class demonstrating the expected interface
 */
export class TestCaseManager implements IMethodExposer {
  static readonly exposesMethods = ['createTestCase', 'executeTest', 'validateResults'] as const;

  createTestCase(name: string, config: Record<string, any>): void {
    console.log(`Creating test case: ${name}`, config);
  }

  executeTest(testId: string): Promise<boolean> {
    console.log(`Executing test: ${testId}`);
    return Promise.resolve(true);
  }

  validateResults(results: any[]): boolean {
    console.log('Validating test results', results);
    return results.length > 0;
  }

  // This method won't be exposed since it's not in exposesMethods
  private internalMethod(): void {
    console.log('Internal method - not exposed');
  }
}

/**
 * Configuration options for PallasService
 */
interface IPallasServiceConfig {
  logger?: ILogger;
  throwOnConflicts?: boolean;
  allowMethodOverride?: boolean;
}

/**
 * Base PallasService class
 */
export class PallasServiceBase {
  private readonly _childInstances = new Map<string, any>();
  private readonly _exposedMethods = new Map<string, { instance: any; methodName: string; className: string }>();
  private readonly _logger: ILogger;
  private readonly _config: Required<IPallasServiceConfig>;

  constructor(config: IPallasServiceConfig = {}) {
    this._config = {
      logger: config.logger ?? new ConsoleLogger(),
      throwOnConflicts: config.throwOnConflicts ?? false,
      allowMethodOverride: config.allowMethodOverride ?? false,
    };
    this._logger = this._config.logger;
  }

  /**
   * Registers a child class instance and exposes its methods with proper typing
   * @param instance - Instance of the child class
   * @param className - Optional class name for identification (defaults to constructor name)
   */
  public registerChild<
    T extends IMethodExposer,
    K extends keyof T = Extract<keyof T, (typeof T)['exposesMethods'][number]>
  >(
    instance: T,
    className?: string
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

    // Get exposed methods from the class constructor
    const constructor = instance.constructor as any;
    const exposedMethods: string[] = constructor.exposesMethods || [];

    if (exposedMethods.length === 0) {
      this._logger.info(`No methods exposed by class '${resolvedClassName}'`);
      return;
    }

    this._exposeMethodsFromChild(instance, exposedMethods, resolvedClassName);
    
    this._logger.info(
      `Successfully registered child class '${resolvedClassName}' with ${exposedMethods.length} exposed methods`,
      { exposedMethods }
    );
  }

  /**
   * Unregisters a child class and removes its exposed methods
   * @param className - Name of the class to unregister
   */
  public unregisterChild(className: string): boolean {
    if (!this._childInstances.has(className)) {
      this._logger.warn(`Attempted to unregister non-existent child class '${className}'`);
      return false;
    }

    // Remove all methods exposed by this class
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
      { removedMethods: methodsToRemove }
    );
    
    return true;
  }

  /**
   * Gets information about all registered child classes
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
   * Checks for method name conflicts across all registered classes
   */
  public getMethodConflicts(): IMethodConflict[] {
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
   * Exposes methods from a child instance to this service
   * @private
   */
  private _exposeMethodsFromChild(
    instance: any,
    exposedMethods: string[],
    className: string
  ): void {
    const conflicts: string[] = [];

    for (const methodName of exposedMethods) {
      // Check if method exists on the instance
      if (typeof instance[methodName] !== 'function') {
        this._logger.error(
          `Method '${methodName}' not found on class '${className}' or is not a function`
        );
        continue;
      }

      // Check for conflicts with existing methods
      if (this._exposedMethods.has(methodName)) {
        const existingMethod = this._exposedMethods.get(methodName)!;
        conflicts.push(methodName);
        
        this._logger.warn(
          `Method name conflict: '${methodName}' is already exposed by class '${existingMethod.className}'`,
          { 
            existingClass: existingMethod.className, 
            newClass: className 
          }
        );

        if (!this._config.allowMethodOverride) {
          continue;
        }
      }

      // Check for conflicts with PallasService's own methods
      if (methodName in this && typeof (this as any)[methodName] === 'function') {
        this._logger.warn(
          `Method name conflict: '${methodName}' conflicts with PallasService's built-in method`,
          { className }
        );
        
        if (!this._config.allowMethodOverride) {
          continue;
        }
      }

      // Bind and expose the method
      (this as any)[methodName] = instance[methodName].bind(instance);
      this._exposedMethods.set(methodName, {
        instance,
        methodName,
        className,
      });
    }

    if (conflicts.length > 0 && this._config.throwOnConflicts) {
      throw new Error(
        `Method name conflicts detected for class '${className}': ${conflicts.join(', ')}`
      );
    }
  }
}

/**
 * Main PallasService class with method composition support
 * 
 * Usage for proper typing:
 * 
 * 1. Create your service instance
 * 2. Register child classes
 * 3. Use declaration merging for full type safety
 * 
 * @example
 * ```typescript
 * const pallasService = new PallasService();
 * const testManager = new TestCaseManager();
 * pallasService.registerChild(testManager);
 * 
 * // For full type safety, use declaration merging:
 * declare module './PallasService' {
 *   interface PallasService extends 
 *     Pick<TestCaseManager, 'createTestCase' | 'executeTest' | 'validateResults'> {}
 * }
 * 
 * // Now you get full IntelliSense:
 * pallasService.createTestCase('test1', {}); // ✅ Fully typed
 * pallasService.executeTest('test1');        // ✅ Fully typed
 * ```
 */
export class PallasService extends PallasServiceBase {
  /**
   * Type-safe method to register a child and get a properly typed service
   * @param instance - Instance of the child class
   * @param className - Optional class name for identification
   * @returns A typed version of the service with exposed methods
   */
  public withChild<
    T extends IMethodExposer,
    K extends keyof T = Extract<keyof T, (typeof T)['exposesMethods'][number]>
  >(
    instance: T,
    className?: string
  ): PallasService & PickExposedMethods<T, K> {
    this.registerChild(instance, className);
    return this as PallasService & PickExposedMethods<T, K>;
  }

  /**
   * Create a new PallasService with multiple children registered and properly typed
   * @param children - Array of child instances to register
   * @returns A new PallasService instance with all children registered
   */
  public static create<T extends IMethodExposer[]>(...children: T): PallasService & 
    UnionToIntersection<{
      [K in keyof T]: T[K] extends IMethodExposer 
        ? PickExposedMethods<T[K], Extract<keyof T[K], (typeof T[K])['exposesMethods'][number]>>
        : never;
    }[number]> {
    const service = new PallasService();
    
    for (const child of children) {
      service.registerChild(child);
    }
    
    return service as any;
  }
}

// Utility type to convert union to intersection
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

// Example usage with proper typing:
/*
// Method 1: Using declaration merging (recommended for complex scenarios)
const pallasService = new PallasService();
const testManager = new TestCaseManager();
pallasService.registerChild(testManager);

// Add this declaration merging in your code:
declare module './PallasService' {
  interface PallasService extends 
    Pick<TestCaseManager, 'createTestCase' | 'executeTest' | 'validateResults'> {}
}

// Method 2: Using the withChild method
const typedService = new PallasService()
  .withChild(new TestCaseManager());

// Method 3: Using the static create method
const createdService = PallasService.create(new TestCaseManager());

// All methods now have full IntelliSense and type safety:
// typedService.createTestCase('test1', {}); // ✅ Fully typed
// typedService.executeTest('test1');        // ✅ Fully typed
*/
