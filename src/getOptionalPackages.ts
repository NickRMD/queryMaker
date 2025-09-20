
/**
  * Type definition for the object returned by getClassValidator function.
  * Contains the class-validator and class-transformer modules.
  */
export type ClassValidatorModule = {
  /**
    * The class-validator module.
    */
  classValidator: typeof import("class-validator");
  /**
    * The class-transformer module.
    */
  classTransformer: typeof import("class-transformer");
};

// Caches for the dynamically imported modules.
// Avoids costly re-imports.

/**
  * Cache for the Zod module.
  */
let zodCache: typeof import('zod') | null = null;

/**
  * Cache for the class-validator and class-transformer modules.
  */
let classValidatorCache: ClassValidatorModule | null = null;

/**
  * Dynamically imports the Zod library.
  * @returns The Zod module.
  * @throws if Zod is not installed.
  */
async function getZod(): Promise<typeof import('zod')> {
  try {
    zodCache = await import('zod');
    return zodCache;
  } catch {
    throw new Error(
      'Zod is not installed. Please install it with "npm install zod" or "yarn add zod".',
    )
  }
}

/**
  * Dynamically imports the class-validator and class-transformer libraries.
  * @returns An object containing the class-validator and class-transformer modules.
  * @throws if either class-validator or class-transformer is not installed.
  */
async function getClassValidator(): Promise<ClassValidatorModule> {
  try {
    const classValidator = await import('class-validator');
    const classTransformer = await import('class-transformer');
    classValidatorCache = { classValidator, classTransformer };
    return classValidatorCache;
  } catch {
    throw new Error([
      'class-validator and class-transformer are not installed.',
      'Please install them with "npm install class-validator class-transformer" or "yarn add class-validator class-transformer".'
    ].join(' '));
  }
}


export {
  getZod,
  getClassValidator,
}
