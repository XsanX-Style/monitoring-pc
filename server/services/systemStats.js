const si = require('systeminformation');
const os = require('os');

async function getStats() {
  const [cpu, currentLoad, mem, fsSize, networkStats, time, cpuTemperature, battery, graphics] =
    await Promise.all([
      si.cpu(),
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      Promise.resolve(si.time()),
      si.cpuTemperature().catch(() => ({ main: null })),
      si.battery().catch(() => null),
      si.graphics().catch(() => ({ controllers: [] })),
    ]);

  return {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    uptimeSeconds: time.uptime,
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      speedGhz: cpu.speed,
      loadPercent: Math.round(currentLoad.currentLoad * 10) / 10,
      perCoreLoad: currentLoad.cpus.map((c) => Math.round(c.load * 10) / 10),
      temperatureC: cpuTemperature.main,
    },
    memory: {
      totalBytes: mem.total,
      usedBytes: mem.active,
      freeBytes: mem.available,
      usedPercent: Math.round((mem.active / mem.total) * 1000) / 10,
    },
    disks: fsSize.map((d) => ({
      mount: d.mount,
      type: d.type,
      totalBytes: d.size,
      usedBytes: d.used,
      usedPercent: Math.round(d.use * 10) / 10,
    })),
    network: networkStats.map((n) => ({
      iface: n.iface,
      rxBytesPerSec: n.rx_sec || 0,
      txBytesPerSec: n.tx_sec || 0,
    })),
    battery: battery && battery.hasBattery
      ? { percent: battery.percent, isCharging: battery.isCharging }
      : null,
    gpu: graphics.controllers.map((g) => ({
      model: g.model,
      vramMB: g.vram,
      temperatureC: g.temperatureGpu ?? null,
      loadPercent: g.utilizationGpu ?? null,
    })),
    timestamp: Date.now(),
  };
}

module.exports = { getStats };
