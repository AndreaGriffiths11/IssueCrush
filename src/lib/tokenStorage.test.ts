describe('tokenStorage (AAA)', () => {
  const SESSION_KEY = 'issuecrush-session-id';

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('debe usar AsyncStorage en web para save/get/delete (Arrange/Act/Assert)', async () => {
    // Arrange
    jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
    const setItem = jest.fn(async () => null);
    const getItem = jest.fn(async () => 'token-web');
    const removeItem = jest.fn(async () => null);
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      setItem,
      getItem,
      removeItem,
    }));
    // Also mock expo-secure-store to avoid importing ESM module from node_modules
    jest.doMock('expo-secure-store', () => ({
      setItemAsync: async () => null,
      getItemAsync: async () => null,
      deleteItemAsync: async () => null,
    }));

    const storage = await import('./tokenStorage');

    // Act
    await storage.saveToken('abc');
    const token = await storage.getToken();
    await storage.deleteToken();

    // Assert
    expect(setItem).toBeCalledWith(SESSION_KEY, 'abc');
    expect(getItem).toBeCalledWith(SESSION_KEY);
    expect(token).toBe('token-web');
    expect(removeItem).toBeCalledWith(SESSION_KEY);
  });

  it('debe usar SecureStore en native para save/get/delete (Arrange/Act/Assert)', async () => {
    // Arrange
    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    const setItem = jest.fn(async () => null);
    const getItem = jest.fn(async () => 'token-native');
    const deleteItem = jest.fn(async () => null);
    jest.doMock('expo-secure-store', () => ({
      setItemAsync: setItem,
      getItemAsync: getItem,
      deleteItemAsync: deleteItem,
    }));

    const storage = await import('./tokenStorage');

    // Act
    await storage.saveToken('xyz');
    const token = await storage.getToken();
    await storage.deleteToken();

    // Assert
    expect(setItem).toBeCalledWith(SESSION_KEY, 'xyz');
    expect(getItem).toBeCalled();
    expect(token).toBe('token-native');
    expect(deleteItem).toBeCalled();
  });
});
