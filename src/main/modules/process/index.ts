import childProcess, { type ExecOptions } from 'node:child_process'

export default class ProcessManager {
  private static processes: childProcess.ChildProcess[] = []

  public static exec(executable: string, options?: ExecOptions) {
    console.debug(`[process] executing ${executable}`)
    const child = childProcess.execFile(executable, {
      windowsHide: true,
      ...options
    })
    child.on('spawn', () => {
      console.debug(`[process] ${executable} spawned.`)
    })
    child.stderr?.on('data', (data) => {
      if (!data) {
        return
      }
      console.error(`[process] ${executable} error:\n${data}`)
    })
  }

  public static killAll() {
    this.processes.forEach((child) => {
      child.kill()
    })
  }
}
