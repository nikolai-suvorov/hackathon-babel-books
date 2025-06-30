describe('Jest Setup', () => {
  it('should run a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to DOM testing utilities', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello World';
    document.body.appendChild(element);

    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello World');
  });
});