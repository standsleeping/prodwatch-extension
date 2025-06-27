/**
 * Core types for hover functionality
 */
export interface HoverContext {
  filePath: string;
  lineText: string;
  position: number;
}

export interface FunctionMatch {
  functionName: string;
  modulePath: string;
  codeLensPath: string;
}

export interface HoverContentData {
  title: string;
  dataPoints: string[];
}

/**
 * Configuration constants
 */
export const FUNCTION_REGEX = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
export const ROOT_MARKERS = ['src', 'app', 'lib', 'tests'];
export const DEFAULT_HOVER_TITLE = '**Function Calls**';

/**
 * Pure validation functions
 */
export const isValidFilePath = (filePath: unknown): filePath is string => {
  return typeof filePath === 'string' && filePath.length > 0 && filePath.endsWith('.py');
};

export const isValidLineText = (lineText: unknown): lineText is string => {
  return typeof lineText === 'string';
};

export const isValidPosition = (position: unknown): position is number => {
  return typeof position === 'number' && position >= 0;
};

export const isValidHoverContext = (context: unknown): context is HoverContext => {
  if (!context || typeof context !== 'object') {
    return false;
  }
  const hc = context as Partial<HoverContext>;
  return isValidFilePath(hc.filePath) &&
         isValidLineText(hc.lineText) &&
         isValidPosition(hc.position);
};

export const isValidFunctionName = (functionName: unknown): functionName is string => {
  return typeof functionName === 'string' && 
         functionName.length > 0 && 
         /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName);
};

export const isValidDataPoints = (dataPoints: unknown): dataPoints is string[] => {
  return Array.isArray(dataPoints) && dataPoints.every(point => typeof point === 'string');
};

/**
 * Pure transformation functions
 */
export const extractFunctionName = (lineText: string): string | null => {
  const match = lineText.match(FUNCTION_REGEX);
  return match ? match[1] : null;
};

export const getModulePath = (filePath: string): string => {
  const pathWithoutExt = filePath.replace(/\.py$/, '');
  const parts = pathWithoutExt.split(/[/\\]/);

  const rootIndex = parts.findIndex(part => ROOT_MARKERS.includes(part));

  if (rootIndex === -1) {
    return parts[parts.length - 1];
  }

  return parts.slice(rootIndex).join('.');
};

export const createCodeLensPath = (modulePath: string, functionName: string): string => {
  return `${modulePath}.${functionName}`;
};

export const createFunctionMatch = (filePath: string, lineText: string): FunctionMatch | null => {
  const functionName = extractFunctionName(lineText);
  if (!functionName) {
    return null;
  }

  const modulePath = getModulePath(filePath);
  const codeLensPath = createCodeLensPath(modulePath, functionName);

  return {
    functionName,
    modulePath,
    codeLensPath
  };
};

/**
 * Pure formatting functions
 */
export const formatHoverTitle = (title?: string): string => {
  return title || DEFAULT_HOVER_TITLE;
};

export const formatDataPoint = (dataPoint: string): string => {
  return `• ${dataPoint}`;
};

export const formatDataPoints = (dataPoints: string[]): string[] => {
  return dataPoints.map(formatDataPoint);
};

export const createHoverContent = (title: string, dataPoints: string[]): string => {
  const formattedTitle = formatHoverTitle(title);
  const formattedPoints = formatDataPoints(dataPoints);
  
  return `${formattedTitle}\n\n${formattedPoints.join('\n\n')}`;
};

export const createHoverContentData = (dataPoints: string[], title?: string): HoverContentData => {
  return {
    title: formatHoverTitle(title),
    dataPoints: [...dataPoints] // Immutable copy
  };
};

/**
 * Pure error handling functions
 */
export const createHoverError = (message: string, context?: string): Error => {
  const fullMessage = context ? `Hover error in ${context}: ${message}` : `Hover error: ${message}`;
  return new Error(fullMessage);
};

export const createValidationError = (message: string, field?: string): Error => {
  const fullMessage = field ? `${field}: ${message}` : message;
  return new Error(fullMessage);
};

export const isHoverError = (error: unknown): error is Error => {
  return error instanceof Error && error.message.includes('Hover error');
};

export const isValidationError = (error: unknown): error is Error => {
  return error instanceof Error && !error.message.includes('Hover error');
};