import { useState, memo, useCallback } from 'react';
export default function App() {
	const [num, update] = useState(0);

  const handleClick = useCallback(() => {
    update(1);
  }, []);
	console.log('App render ', num);
	return (
		<div onClick={() => update(num + 1)}>
      <Cpn1 onClick={handleClick} />
		</div>
	);
}

const Cpn1 = memo(function ({ onClick }) {
	return <div onClick={onClick}>cpn1</div>;
});

const Cpn = memo(function ({ num, name }) {
	console.log('render ', name);
	return (
		<div>
			{name}: {num}
			<Child />
		</div>
	);
});
function Child() {
	console.log('Child render');
	return <p>i am child</p>;
}