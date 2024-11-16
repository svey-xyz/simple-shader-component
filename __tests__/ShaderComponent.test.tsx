import { render } from '@testing-library/react';
import { ShaderComponent } from '../src';
import React from 'react';

describe('ShaderComponent', () => {
	it('renders without crashing', () => {
		const { container } = render(<ShaderComponent args={{}} />);
		expect(container).toBeInTheDocument();
	});
});