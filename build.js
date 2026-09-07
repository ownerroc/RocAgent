import { exec } from 'child_process';
const run = async () => {
    const { stdout, stderr } = await exec('vite build --outDir dist --lib');
    console.log(stdout);
    console.error(stderr);
};
run();