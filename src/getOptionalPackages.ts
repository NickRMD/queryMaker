
/**
  * Type definition for the object returned by getClassValidator function.
  * Contains the class-validator and class-transformer modules.
  */
export type ClassValidatorModule = {
  classValidator: typeof import("class-validator");
  classTransformer: typeof import("class-transformer");
};

/**
  * Dynamically imports the Zod library.
  * @returns A promise that resolves to the Zod module.
  * @throws if Zod is not installed.
  */
async function getZod(): Promise<typeof import('zod')> {
  try {
    return await import('zod');
  } catch {
    throw new Error(
      'Zod is not installed. Please install it with "npm install zod" or "yarn add zod".',
    )
  }
}

/**
  * Dynamically imports the class-validator and class-transformer libraries.
  * @returns A promise that resolves to an object containing the class-validator and class-transformer modules.
  * @throws if either class-validator or class-transformer is not installed.
  */
async function getClassValidator(): Promise<ClassValidatorModule> {
  try {
    const classValidator = await import('class-validator');
    const classTransformer = await import('class-transformer');
    return { classValidator, classTransformer };
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
