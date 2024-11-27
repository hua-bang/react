import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		console.log('App mount');
	}, []);
	useEffect(() => {
		console.log('num change create', visible);
		return () => {
			console.log('num change destroy', visible);
		};
	}, [visible]);

	return (
		<div onClick={() => setVisible(prev => !prev)}>
			{visible ? <Child /> : 'noop'}
		</div>
	);
}

function Child() {
	useEffect(() => {
		console.log('Child mount');
		return () => console.log('Child unmount');
	}, []);
	return 'i am child';
}



const root = document.getElementById('root');

if (root) {
  const dom = ReactDOM.createRoot(root);
  dom.render(<App />);
}