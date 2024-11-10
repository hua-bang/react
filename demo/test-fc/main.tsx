import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	return (
		<div key="parent">
			<Child />
		</div>
	);
}
function Child() {
	return <span>big-react</span>;
}


const root = document.getElementById('root');

if(root) {
  const dom = ReactDOM.createRoot(root);
  dom.render(<App />);
}