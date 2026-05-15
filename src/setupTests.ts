// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Mock attachInternals for custom elements in Jest/jsdom
if (!HTMLElement.prototype.attachInternals) {
	const mockInternals = {
		setValidity: () => {},
		checkValidity: () => true,
		reportValidity: () => true,
		states: { add: () => {}, delete: () => {}, has: () => false },
		shadowRoot: null,
		// Add any other methods/properties as needed
	};
	HTMLElement.prototype.attachInternals = function () {
		return mockInternals as any;
	};
}
