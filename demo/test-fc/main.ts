interface Work {
  count: number;
}

const workList: Work[] = [];
const root = document.querySelector('#root');

let remind = 2;

const execLongTask = (count: number) => {
  let i = 0;
  while (i < count) {
    i++;
  }
}

function insertSpan(content) {
  const span = document.createElement('span');
  span.innerText = content;
  span.className = `pri-${content}`;

  root?.appendChild(span);
}

const perform = (work: Work) => {
  execLongTask(work.count * 10);
  while (work.count) {
    work.count--;
    insertSpan(1);
  }
  if (remind) {
    workList.push({ count: 100000 });
    remind--;
  }
  schedule();
}

const schedule = () => {
  const work = workList.shift();
  console.log('work', work);
  if (work) {
    perform(work);
  }
}

const button = document.querySelector('button');

if (button) {
  button.addEventListener('click', () => {
    workList.push({ count: 100000 });
    schedule();
  })
}