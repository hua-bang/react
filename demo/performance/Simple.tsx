import { useState } from 'react';
export default function App() {
	const [num, update] = useState(0);
	console.log('App render ', num);
	return (
		<div
			onClick={() => {
				update(num => num + 1);
			}}
		>
			{num}
		</div>
	);
}
function Cpn() {
	console.log('cpn render');
	return <div>cpn</div>;
}