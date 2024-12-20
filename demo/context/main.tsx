import { useState, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';
const ctxA = createContext('deafult A');
const ctxB = createContext('default B');
function App() {
	return (
		<ctxA.Provider value={'A0'}>
			<ctxB.Provider value={'B0'}>
				<ctxA.Provider value={'A1'}>
					<Cpn />
				</ctxA.Provider>
			</ctxB.Provider>
			<Cpn />
		</ctxA.Provider>
	);
}
function Cpn() {
	const a = useContext(ctxA);
	const b = useContext(ctxB);
  console.log(a, b);
	return (
    <>
      <div>
        <span>a:</span>
        <span>{a}</span>
      </div>
      <div>
        <span>b:</span>
        <span>{b}</span>
      </div>
    </>		
	);
}
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);