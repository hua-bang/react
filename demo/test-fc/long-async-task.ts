
const execLongTask1 = (count: number) => {
  let i = 0;
  while (i < count) {
    i++;
    const span = document.createElement("span");
    span.innerText = `${i}`;
    document.body.appendChild(span);
  }
}

const execLongAsyncTask = () => {
  return Promise.resolve().then(() => {
    execLongTask1(100000);
  });
}

const render = () => {
  execLongAsyncTask();
  const h1 = document.createElement("h1");
  h1.innerText = "long-async-task";
  document.body.appendChild(h1);

};

const button1 = document.querySelector('button');

if (button1) {
  button1.addEventListener('click', () => {
    render();
  })
}

