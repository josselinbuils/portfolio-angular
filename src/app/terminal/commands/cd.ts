export function cd(terminal, args) {
  const directories = ['bin', 'boot', 'dev', 'etc', 'home', 'lib', 'media', 'mnt', 'opt', 'proc', 'srv', 'usr', 'var', 'tmp'];

  if (args[0]) {
    terminal.content += directories.indexOf(args[0]) !== -1
      ? `-bash: cd: ${args[0]}: Permission denied`
      : `-bash: cd: ${args[0]}: No such file or directory`;
  }
}
