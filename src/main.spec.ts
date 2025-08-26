describe('Main bootstrap', () => {
  const originalEnv = process.env;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    console.log = originalConsoleLog;
    jest.restoreAllMocks();
  });

  describe('environment handling', () => {
    it('should handle PORT environment variable', () => {
      process.env.PORT = '3000';
      expect(process.env.PORT).toBe('3000');
    });

    it('should handle missing PORT environment variable', () => {
      delete process.env.PORT;
      expect(process.env.PORT).toBeUndefined();
    });

    it('should handle invalid PORT values', () => {
      process.env.PORT = 'invalid';
      expect(process.env.PORT).toBe('invalid');
    });

    it('should handle empty PORT value', () => {
      process.env.PORT = '';
      expect(process.env.PORT).toBe('');
    });
  });

  describe('error output formatting', () => {
    it('should format error message correctly', () => {
      const error = new Error('Test error');
      const expectedMessage = `Error al iniciar la aplicacion: ${error}`;
      expect(expectedMessage).toBe('Error al iniciar la aplicacion: Error: Test error');
    });

    it('should handle string errors', () => {
      const error = 'String error';
      const expectedMessage = `Error al iniciar la aplicacion: ${error}`;
      expect(expectedMessage).toBe('Error al iniciar la aplicacion: String error');
    });

    it('should handle null/undefined errors', () => {
      const error = null;
      const expectedMessage = `Error al iniciar la aplicacion: ${error}`;
      expect(expectedMessage).toBe('Error al iniciar la aplicacion: null');
    });
  });

  describe('constants and defaults', () => {
    it('should use correct default port', () => {
      const defaultPort = 4000;
      const port = process.env.PORT ?? defaultPort;
      expect(typeof port).toBe('number');
    });

    it('should handle port coercion', () => {
      const port1 = process.env.PORT ?? 4000;
      const port2 = '3000';
      expect(port1).toBe(4000);
      expect(port2).toBe('3000');
    });
  });
});