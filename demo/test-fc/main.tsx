import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	return (
		<div key="parent">
			<Child />
		</div>
	);
}
function Child() {
  const [num, setNum] = useState(100);
  window.setNum = setNum;
	return <span>{num}</span>;
}


const root = document.getElementById('root');

if(root) {
  const dom = ReactDOM.createRoot(root);
  dom.render(<App />);
}