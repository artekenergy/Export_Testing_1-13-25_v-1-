(() => {
  // --------------------------
  // Cached DOM Elements & Constants
  // --------------------------
  const DOM = {
    connectionStatus: document.getElementById("connection-status"),
    connectBtn: document.getElementById("connect-btn"),
    disconnectBtn: document.getElementById("disconnect-btn"),
    toggleButtons: document.querySelectorAll(".toggle-btn"),
    momentaryButtons: document.querySelectorAll(".momentary-btn"),
    logElement: document.getElementById("log"),
    splashOverlay: document.getElementById("splash-overlay"),
    acLimitModal: document.getElementById("ac-limit-modal"),
    acLimitValue: document.getElementById("ac-limit-value"),
    tabButtons: document.querySelectorAll(".tab-button"),
    hvacTabButtons: document.querySelectorAll(".hvac-tab-button"),
    lightingTabButtons: document.querySelectorAll(".lighting-tab-button"),
    rgbZoneButtons: document.querySelectorAll(".rgb-zone-button"),
    accessoryButtons: document.querySelectorAll(".accessory-zone-button"),
    thermostat: {
      slider: document.getElementById("temp-slider"),
      targetTemp: document.getElementById("target-temp"),
    },
    fanControls: {
      ventFan: {
        up: document.getElementById("vent-fan-up"),
        down: document.getElementById("vent-fan-down"),
        value: document.getElementById("vent-fan-value"),
      },
      ventFan2: {
        up: document.getElementById("vent-fan2-up"),
        down: document.getElementById("vent-fan2-down"),
        value: document.getElementById("vent-fan2-value"),
      },
      fanSpeed: {
        up: document.getElementById("fan-speed-up"),
        down: document.getElementById("fan-speed-down"),
        value: document.getElementById("fan-speed-value"),
      },
    },
    acLimit: {
      btn: document.getElementById("ac-limit-btn"),
      modal: document.getElementById("ac-limit-modal"),
      close: document.querySelector(".close-limit"),
      cancel: document.getElementById("cancel-limit"),
      apply: document.getElementById("apply-limit"),
      value: document.getElementById("ac-limit-value"),
      up: document.getElementById("ac-limit-up"),
      down: document.getElementById("ac-limit-down"),
      presets: document.querySelectorAll(".preset-btn"),
    },
  };

<<<<<<< HEAD
  const CONSTANTS = {
    HEARTBEAT_INTERVAL: 5000, // 5 seconds
    MESSAGE_TYPES: {
      HEARTBEAT: 48,
      TOGGLE_BUTTON: 17,
      PONG: 128,
    },
    BUTTON_STATES: {
      ON: 3,
      OFF: 5,
    },
    MODE_VALUES: {
      on: 1,
      off: 0,
      charger: 2,
      rgb: 1,
      white: 2,
    },
    COMMAND_IDS: {
      FAN_SPEED: 45,
      VENT_FAN: 63,
      VENT_FAN2: 67,
      THERMOSTAT: 30,
      AC_LIMIT: 12,
    },
    SLIDER_IDS: {
=======
  // --------------------------
  // WebSocket & Heartbeat Setup
  // --------------------------
  let socket = null
  const HEARTBEAT_INTERVAL = 5000 // 5 sec heartbeat
  let heartbeatInterval = null
  let heartbeatTimer = null

  // Helper: Check if socket is open
  const isSocketOpen = () => socket && socket.readyState === WebSocket.OPEN

  // --------------------------
  // Logging Utility
  // --------------------------
  const log = (message) => {
    const entry = document.createElement("div")
    entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`
    logElement?.appendChild(entry)
    if (logElement) logElement.scrollTop = logElement.scrollHeight
  }

  // --------------------------
  // WebSocket Connection Functions
  // --------------------------
  function connectWebSocket() {
    const host = document.getElementById("ws-host")?.value || "172.16.11.7"
    const port = document.getElementById("ws-port")?.value || "8888"
    if (isSocketOpen()) socket.close()
    const wsUrl = `ws://${host}:${port}/ws`
    log(`Connecting to ${wsUrl}...`)

    try {
      socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        connectionStatus.textContent = `Connected to ${wsUrl}`
        connectionStatus.className = "connection-status connected"
        log("Connection established")
        startHeartbeat()
      }

      socket.onmessage = (event) => {
        log(`Received: ${event.data}`)
        try {
          const packet = JSON.parse(event.data)

          // Handle heartbeat ping from server
          if (
            packet.messagecmd === 5 &&
            packet.messagetype === 48 &&
            packet.size === 0
          ) {
            sendPong()
            log("Responding to server heartbeat")
            return
          }

          // Handle NMEA 2000 data
          if (packet.messagetype === 82) {
            // NMEA message type
            const decodedData = decoder.decodeN2KDataItem(packet)
            if (decodedData) {
              log(
                `Decoded NMEA Signal: ID=${decodedData.signalId}, Value=${decodedData.value}`
              )
              handleDecodedSignal(decodedData)
            }
          }

          // Handle MFD channel data
          if (packet.messagetype === 16) {
            // MFD status
            const decodedData = decoder.decodeMFDChannelItem(packet)
            if (decodedData) {
              log(
                `Decoded MFD Signal: ID=${decodedData.signalId}, Value=${decodedData.value}`
              )
              handleDecodedSignal(decodedData)
            }
          }
        } catch (e) {
          console.error("Error processing WebSocket message:", e)
        }
      }

      socket.onclose = () => {
        connectionStatus.textContent = "Disconnected"
        connectionStatus.className = "connection-status disconnected"
        log("Connection closed")
        stopHeartbeat()
      }

      socket.onerror = (error) => {
        connectionStatus.textContent = "Connection error"
        connectionStatus.className = "connection-status disconnected"
        log("Error: " + error)
      }
    } catch (error) {
      log("Failed to connect: " + error)
    }
  }

  function startHeartbeat() {
    stopHeartbeat() // clear any existing heartbeat
    heartbeatInterval = setInterval(() => {
      if (isSocketOpen()) sendHeartbeat()
    }, HEARTBEAT_INTERVAL)
  }

  function stopHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval)
    heartbeatInterval = null
    if (heartbeatTimer) clearTimeout(heartbeatTimer)
    heartbeatTimer = null
  }

  function sendHeartbeat() {
    if (!isSocketOpen()) return
    const heartbeat = { messagetype: 48, messagecmd: 5, size: 0, data: [] }
    log("Sending heartbeat")
    socket.send(JSON.stringify(heartbeat))
  }

  function sendPong() {
    if (!isSocketOpen()) return
    const pong = { messagetype: 128, messagecmd: 0, size: 1, data: [0] }
    socket.send(JSON.stringify(pong))
  }

  const DataTypes = {
    int8: 5,
    uint8: 4,
    int16: 3,
    uint16: 2,
    int32: 1,
    uint32: 0,
    int64: 7,
    uint64: 6,
  }

  // Add the decoder class
  class SignalDecoder {
    constructor() {
      this.signalInfoMap = new Map()
    }

    decodeN2KDataItem(packet) {
      if (packet.messagecmd === 1) {
        // statusUpdate
        const signalId = packet.data[0] | (packet.data[1] << 8)
        return {
          signalId: signalId,
          valueTypeIdentifier: packet.data[3] | (packet.data[4] << 8),
          value: this._getValue(signalId, packet.data, 5),
        }
      }
      return null
    }

    _getValue(signalId, data, offset) {
      const array = new Uint8Array(data)
      const view = new DataView(array.buffer)

      // Get data type from signal info or default to int32
      const dataType =
        this.signalInfoMap.get(signalId)?.dataType || DataTypes.int32

      switch (dataType) {
        case DataTypes.int8:
          return view.getInt8(offset)
        case DataTypes.uint8:
          return view.getUint8(offset)
        case DataTypes.int16:
          return view.getInt16(offset, true)
        case DataTypes.uint16:
          return view.getUint16(offset, true)
        case DataTypes.int32:
          return view.getInt32(offset, true)
        case DataTypes.uint32:
          return view.getUint32(offset, true)
        case DataTypes.int64:
          return Number(view.getBigInt64(offset, true))
        case DataTypes.uint64:
          return Number(view.getBigUint64(offset, true))
      }
    }
  }

  // Create an instance of the decoder
  const decoder = new SignalDecoder()

  // Modify your existing WebSocket onmessage handler
  socket.onmessage = (event) => {
    log(`Received: ${event.data}`)
    try {
      const packet = JSON.parse(event.data)

      // Handle heartbeat ping from server
      if (
        packet.messagecmd === 5 &&
        packet.messagetype === 48 &&
        packet.size === 0
      ) {
        sendPong()
        log("Responding to server heartbeat")
        return
      }

      // Handle NMEA 2000 data
      if (packet.messagetype === 82) {
        // NMEA message type
        const decodedData = decoder.decodeN2KDataItem(packet)
        if (decodedData) {
          log(
            `Decoded NMEA Signal: ID=${decodedData.signalId}, Value=${decodedData.value}`
          )
          handleDecodedSignal(decodedData)
        }
      }
    } catch (e) {
      console.error("Error processing WebSocket message:", e)
    }
  }

  // Add a handler for decoded signals
  function handleDecodedSignal(signal) {
    // Track the signal
    signalMonitor.trackSignal(
      signal.signalId,
      signal.value,
      signal.valueTypeIdentifier ? "NMEA" : "MFD"
    )

    // Update signal in manager (existing code)
    signalManager.updateSignal(signal.signalId, signal.value)
    // Update UI elements based on signal ID and value
    // Example:
    const element = document.querySelector(
      `[data-signal-id="${signal.signalId}"]`
    )
    if (element) {
      if (element.classList.contains("signalvalue")) {
        element.textContent = signal.value.toString()
      } else if (element.classList.contains("toggle-btn")) {
        element.classList.toggle("active", Boolean(signal.value))
      }
    }
  }

  // Add these utility functions
  function showSignalMonitor() {
    // Create or get monitor overlay
    let monitorOverlay = document.getElementById("signal-monitor")
    if (!monitorOverlay) {
      monitorOverlay = document.createElement("div")
      monitorOverlay.id = "signal-monitor"
      monitorOverlay.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: #fff;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 9999;
        `
      document.body.appendChild(monitorOverlay)
    }

    // Update monitor content
    function updateMonitor() {
      const signals = signalMonitor.getAllSignals()
      monitorOverlay.innerHTML = `
            <h3>Active Signals (${signals.length})</h3>
            <table style="border-collapse: collapse;">
                <tr>
                    <th style="padding: 5px; border: 1px solid #444;">ID</th>
                    <th style="padding: 5px; border: 1px solid #444;">Value</th>
                    <th style="padding: 5px; border: 1px solid #444;">Type</th>
                    <th style="padding: 5px; border: 1px solid #444;">Updates</th>
                    <th style="padding: 5px; border: 1px solid #444;">Last Update</th>
                </tr>
                ${signals
                  .map(
                    (s) => `
                    <tr>
                        <td style="padding: 5px; border: 1px solid #444;">${
                          s.id
                        }</td>
                        <td style="padding: 5px; border: 1px solid #444;">${
                          s.value
                        }</td>
                        <td style="padding: 5px; border: 1px solid #444;">${
                          s.type
                        }</td>
                        <td style="padding: 5px; border: 1px solid #444;">${
                          s.updateCount
                        }</td>
                        <td style="padding: 5px; border: 1px solid #444;">${s.timeSinceUpdate.toFixed(
                          1
                        )}s</td>
                    </tr>
                `
                  )
                  .join("")}
            </table>
        `
    }

    // Update every second
    const monitorInterval = setInterval(updateMonitor, 1000)

    // Add close button
    const closeBtn = document.createElement("button")
    closeBtn.textContent = "Close Monitor"
    closeBtn.style.marginTop = "10px"
    closeBtn.onclick = () => {
      clearInterval(monitorInterval)
      monitorOverlay.remove()
    }
    monitorOverlay.appendChild(closeBtn)
  }

  // Create signal manager instance
  const signalManager = new SignalManager()

  // Modify the existing handleDecodedSignal function
  function handleDecodedSignal(signal) {
    // Update signal in manager
    signalManager.updateSignal(signal.signalId, signal.value)

    // Update UI elements based on signal ID and value
    const elements = document.querySelectorAll(
      `[data-signal-id="${signal.signalId}"]`
    )
    elements.forEach((element) => {
      if (element.classList.contains("signalvalue")) {
        element.textContent = signal.value.toString()
      } else if (element.classList.contains("toggle-btn")) {
        element.classList.toggle("active", Boolean(signal.value))
      } else if (element.classList.contains("slider")) {
        element.value = signal.value
        const valueDisplay = element.nextElementSibling
        if (valueDisplay?.classList.contains("slider-value")) {
          valueDisplay.textContent = `${signal.value}%`
        }
      }
    })
  }
  // Signal monitoring and debugging
  class SignalMonitor {
    constructor() {
      this.signals = new Map()
      this.lastUpdateTime = new Map()
    }

    // Track incoming signal
    trackSignal(signalId, value, type = "unknown") {
      this.signals.set(signalId, {
        value,
        type,
        lastUpdate: new Date(),
        updateCount: (this.signals.get(signalId)?.updateCount || 0) + 1,
      })
    }

    // Get all tracked signals
    getAllSignals() {
      return Array.from(this.signals.entries()).map(([id, data]) => ({
        id,
        ...data,
        timeSinceUpdate: (new Date() - data.lastUpdate) / 1000,
      }))
    }

    // Print signal summary to console
    printSignalSummary() {
      console.group("Active Signals Summary")
      console.table(this.getAllSignals())
      console.groupEnd()
    }
  }

  // --------------------------
  // Command Sending Functions
  // --------------------------
  function sendToggleButtonCommand(id, state) {
    if (!isSocketOpen()) {
      log("Not connected to WebSocket server")
      return
    }
    const command = {
      messagetype: 17,
      messagecmd: 0,
      size: 3,
      data: [id, 0, state ? 3 : 5], // ON = 3, OFF = 5
    }
    log(`Sending toggle button ${id} command: ${state ? "ON" : "OFF"}`)
    socket.send(JSON.stringify(command))
  }

  function sendButtonCommand(id, state) {
    if (!isSocketOpen()) {
      log("Not connected to WebSocket server")
      return
    }
    const command = {
      messagetype: 17,
      messagecmd: 1,
      size: 3,
      data: [id, 0, state ? 1 : 0],
    }
    log(`Sending button ${id} command: ${state ? "ON" : "OFF"}`)
    socket.send(JSON.stringify(command))
  }

  function sendSliderCommand(id, value) {
    if (!isSocketOpen()) {
      log("Not connected to WebSocket server")
      return
    }
    const command = {
      messagetype: 17,
      messagecmd: 3,
      size: 5,
      data: [id, 0, 0, value & 0xff, (value >> 8) & 0xff],
    }
    log(`Setting slider ${id} to value: ${value}`)
    socket.send(JSON.stringify(command))
  }

  function sendThermostatCommand(temp) {
    if (!isSocketOpen()) {
      log("Not connected to WebSocket server")
      return
    }
    const command = {
      messagetype: 17,
      messagecmd: 4,
      size: 3,
      data: [30, 0, temp],
    }
    log(`Setting thermostat to ${temp}°F`)
    socket.send(JSON.stringify(command))
  }

  // Zone-related commands (RGB, brightness, mode, warmth)
  function sendZoneRgbCommand(zone, colorHex) {
    if (!isSocketOpen()) {
      log("Not connected to WebSocket server")
      return
    }
    const r = parseInt(colorHex.substring(1, 3), 16)
    const g = parseInt(colorHex.substring(3, 5), 16)
    const b = parseInt(colorHex.substring(5, 7), 16)
    const zoneOffset = 100 + parseInt(zone, 10)
    const command = {
      messagetype: 17,
      messagecmd: 6,
      size: 5,
      data: [zoneOffset, r, g, b, 0],
    }
    log(`Setting Zone ${zone} RGB to: R=${r}, G=${g}, B=${b}`)
    socket.send(JSON.stringify(command))
  }

  function sendZoneBrightnessCommand(zone, brightness) {
    if (!isSocketOpen()) return
    const zoneOffset = 200 + parseInt(zone, 10)
    const command = {
      messagetype: 17,
      messagecmd: 3,
      size: 5,
      data: [zoneOffset, 0, 0, brightness & 0xff, (brightness >> 8) & 0xff],
    }
    log(`Setting Zone ${zone} brightness to: ${brightness}%`)
    socket.send(JSON.stringify(command))
  }

  function sendZoneModeCommand(zone, mode) {
    if (!isSocketOpen()) return
    const zoneOffset = 300 + parseInt(zone, 10)
    const modeValue = mode === "rgb" ? 1 : 2
    const command = {
      messagetype: 17,
      messagecmd: 4,
      size: 3,
      data: [zoneOffset, 0, modeValue],
    }
    log(`Setting Zone ${zone} mode to: ${mode}`)
    socket.send(JSON.stringify(command))
  }

  function sendZoneWarmthCommand(zone, temperature) {
    if (!isSocketOpen()) return
    let r, g, b
    // Simplified color conversion based on temperature
    if (temperature <= 4600) {
      const factor = (temperature - 2700) / (4600 - 2700)
      r = 255
      g = Math.round(255 * factor)
      b = Math.round(190 * factor)
    } else {
      const factor = (temperature - 4600) / (6500 - 4600)
      r = Math.round(255 * (1 - factor * 0.3))
      g = Math.round(255 * (1 - factor * 0.1))
      b = 255
    }
    const zoneOffset = 100 + parseInt(zone, 10)
    const command = {
      messagetype: 17,
      messagecmd: 7,
      size: 5,
      data: [zoneOffset, r, g, b, 1], // '1' indicates white mode
    }
    log(
      `Setting Zone ${zone} temperature to: ${temperature}K (R=${r}, G=${g}, B=${b})`
    )
    socket.send(JSON.stringify(command))
  }

  function sendAcLimitCommand(limit) {
    if (!isSocketOpen()) return
    const command = {
      messagetype: 17,
      messagecmd: 4,
      size: 3,
      data: [12, 0, limit],
    }
    log(`Setting AC input limit to: ${limit}A`)
    socket.send(JSON.stringify(command))
  }

  // Fan speed command (using a given command ID)
  function sendFanSpeedCommand(commandId, speed) {
    if (!isSocketOpen()) return
    const command = {
      messagetype: 17,
      messagecmd: 4,
      size: 3,
      data: [commandId, 0, speed],
    }
    log(`Setting fan speed (ID: ${commandId}) to: ${speed}`)
    socket.send(JSON.stringify(command))
  }

  function sendVentTimerCommand(time) {
    if (!isSocketOpen()) return
    const command = {
      messagetype: 17,
      messagecmd: 4,
      size: 3,
      data: [68, 0, time],
    }
    log(`Setting vent timer to: ${time} minutes`)
    socket.send(JSON.stringify(command))
  }

  function sendRgbCommand(r, g, b) {
    if (!isSocketOpen()) {
      log("Not connected to WebSocket server")
      return
    }
    const command = {
      messagetype: 17,
      messagecmd: 6,
      size: 5,
      data: [45, r, g, b, 0],
    }
    log(`Setting RGB to: R=${r}, G=${g}, B=${b}`)
    socket.send(JSON.stringify(command))
  }

  // --------------------------
  // UI Setup Functions
  // --------------------------
  function initializeButtons() {
    // Connect/disconnect
    connectBtn?.addEventListener("click", connectWebSocket)
    disconnectBtn?.addEventListener("click", () => {
      if (socket) {
        socket.close()
        stopHeartbeat()
      }
    })
    // Toggle buttons
    toggleButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const componentId = parseInt(btn.dataset.id, 10)
        const isActive = btn.classList.toggle("active")
        sendToggleButtonCommand(componentId, isActive)
      })
    })
    // Momentary buttons
    momentaryButtons.forEach((btn) => {
      btn.addEventListener("mousedown", () => {
        const id = parseInt(btn.dataset.id, 10)
        sendButtonCommand(id, true)
        btn.classList.add("active")
      })
      btn.addEventListener("mouseup", () => {
        const id = parseInt(btn.dataset.id, 10)
        sendButtonCommand(id, false)
        btn.classList.remove("active")
      })
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault()
        const id = parseInt(btn.dataset.id, 10)
        sendButtonCommand(id, true)
        btn.classList.add("active")
      })
      btn.addEventListener("touchend", (e) => {
        e.preventDefault()
        const id = parseInt(btn.dataset.id, 10)
        sendButtonCommand(id, false)
        btn.classList.remove("active")
      })
    })
    // MultiPlus buttons (mutually exclusive group)
    const multiplusBtns = document.querySelectorAll(".multiplus-btn")
    multiplusBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        multiplusBtns.forEach((b) => b.classList.remove("active"))
        this.classList.add("active")
        const mode = this.getAttribute("data-mode")
        const componentId = parseInt(this.getAttribute("data-id"), 10)
        // Use a mapping instead of a switch for clarity
        const modeMap = { on: 1, off: 0, charger: 2 }
        const modeValue = modeMap[mode] ?? 0
        if (isSocketOpen()) {
          const command = {
            messagetype: 17,
            messagecmd: 4,
            size: 3,
            data: [componentId, 0, modeValue],
          }
          log(`Setting MultiPlus mode to: ${mode}`)
          socket.send(JSON.stringify(command))
        }
      })
    })
  }

  function setupSliders() {
    const sliders = document.querySelectorAll("input[type='range']")
    sliders.forEach((slider) => {
      const valueDisplay = slider.nextElementSibling
      if (valueDisplay?.classList.contains("slider-value")) {
        slider.addEventListener("input", () => {
          const value = slider.value
          valueDisplay.textContent = `${value}%`
          const sliderId = slider.id || "slider"
          sendSliderCommand(getSliderCommandId(sliderId), parseInt(value, 10))
        })
      }
    })
  }

  function getSliderCommandId(sliderId) {
    const sliderMap = {
>>>>>>> 7ba77be65bcd3a60bde9ba0c526c48e51e04303d
      "fan-speed": 20,
      "interior-main": 41,
      "interior-reading": 42,
      "exterior-awning": 43,
      "rgb-brightness": 44,
    },
  };

  // Group definitions for mutually exclusive button sets
  const EXCLUSIVE_BUTTON_GROUPS = [
    ["24", "89", "23", "22"], // HVAC mode buttons
    ["25", "26", "27"], // Fan speed buttons
    ["51", "52"], // RGB/White mode Zone 1
    ["53", "54"], // RGB/White mode Zone 2
    ["55", "56"], // RGB/White mode Zone 3
    ["57", "58"], // RGB/White mode Zone 4
  ];

  // --------------------------
  // WebSocket Setup & Management
  // --------------------------
  let socket = null;
  let heartbeatInterval = null;
  let heartbeatTimer = null;
  let currentAcLimit = 30;

  // Helper: Check if socket is open
  const isSocketOpen = () => socket && socket.readyState === WebSocket.OPEN;

  // Logging utility with error handling
  const log = (message) => {
    if (!DOM.logElement) return;

    const entry = document.createElement("div");
    entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    DOM.logElement.appendChild(entry);
    DOM.logElement.scrollTop = DOM.logElement.scrollHeight;
  };

  // --------------------------
  // WebSocket Connection Functions
  // --------------------------
  function connectWebSocket() {
    const host = document.getElementById("ws-host")?.value || "172.16.11.7";
    const port = document.getElementById("ws-port")?.value || "8888";
    if (isSocketOpen()) socket.close();

    const wsUrl = `ws://${host}:${port}/ws`;
    log(`Connecting to ${wsUrl}...`);

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (DOM.connectionStatus) {
          DOM.connectionStatus.textContent = `Connected to ${wsUrl}`;
          DOM.connectionStatus.className = "connection-status connected";
        }
        log("Connection established");
        startHeartbeat();
      };

      socket.onmessage = handleWebSocketMessage;

      socket.onclose = () => {
        if (DOM.connectionStatus) {
          DOM.connectionStatus.textContent = "Disconnected";
          DOM.connectionStatus.className = "connection-status disconnected";
        }
        log("Connection closed");
        stopHeartbeat();
      };

      socket.onerror = (error) => {
        if (DOM.connectionStatus) {
          DOM.connectionStatus.textContent = "Connection error";
          DOM.connectionStatus.className = "connection-status disconnected";
        }
        log("Error: " + (error.message || "WebSocket error"));
      };
    } catch (error) {
      log("Failed to connect: " + (error.message || error));
    }
  }

  function handleWebSocketMessage(event) {
    log(`Received: ${event.data}`);
    try {
      const message = JSON.parse(event.data);
      // Handle heartbeat ping from server: (messagecmd: 5, messagetype: 48, size: 0)
      if (
        message.messagecmd === 5 &&
        message.messagetype === CONSTANTS.MESSAGE_TYPES.HEARTBEAT &&
        message.size === 0
      ) {
        sendPong();
        log("Responding to server heartbeat");
      }
      // Add other message handlers as needed
    } catch (e) {
      // Fail silently if message is not valid JSON
    }
  }

  function startHeartbeat() {
    stopHeartbeat(); // clear any existing heartbeat
    heartbeatInterval = setInterval(() => {
      if (isSocketOpen()) sendHeartbeat();
    }, CONSTANTS.HEARTBEAT_INTERVAL);
  }

  function stopHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }

  function sendHeartbeat() {
    if (!isSocketOpen()) return;

    const heartbeat = {
      messagetype: CONSTANTS.MESSAGE_TYPES.HEARTBEAT,
      messagecmd: 5,
      size: 0,
      data: [],
    };
    log("Sending heartbeat");
    socket.send(JSON.stringify(heartbeat));
  }

  function sendPong() {
    if (!isSocketOpen()) return;

    const pong = {
      messagetype: CONSTANTS.MESSAGE_TYPES.PONG,
      messagecmd: 0,
      size: 1,
      data: [0],
    };
    socket.send(JSON.stringify(pong));
  }

  // --------------------------
  // Unified Command Sender
  // --------------------------
  function sendCommand(type, params) {
    if (!isSocketOpen()) {
      log("Not connected to WebSocket server");
      return false;
    }

    try {
      let command;

      switch (type) {
        case "toggle":
          command = {
            messagetype: CONSTANTS.MESSAGE_TYPES.TOGGLE_BUTTON,
            messagecmd: 0,
            size: 3,
            data: [
              params.id,
              0,
              params.state
                ? CONSTANTS.BUTTON_STATES.ON
                : CONSTANTS.BUTTON_STATES.OFF,
            ],
          };
          log(
            `Sending toggle button ${params.id} command: ${
              params.state ? "ON" : "OFF"
            }`
          );
          break;

        case "button":
          command = {
            messagetype: CONSTANTS.MESSAGE_TYPES.TOGGLE_BUTTON,
            messagecmd: 1,
            size: 3,
            data: [params.id, 0, params.state ? 1 : 0],
          };
          log(
            `Sending button ${params.id} command: ${
              params.state ? "ON" : "OFF"
            }`
          );
          break;

        case "slider":
          const value = params.value;
          command = {
            messagetype: CONSTANTS.MESSAGE_TYPES.TOGGLE_BUTTON,
            messagecmd: 3,
            size: 5,
            data: [params.id, 0, 0, value & 0xff, (value >> 8) & 0xff],
          };
          log(`Setting slider ${params.id} to value: ${value}`);
          break;

        case "thermostat":
          command = {
            messagetype: CONSTANTS.MESSAGE_TYPES.TOGGLE_BUTTON,
            messagecmd: 4,
            size: 3,
            data: [CONSTANTS.COMMAND_IDS.THERMOSTAT, 0, params.temp],
          };
          log(`Setting thermostat to ${params.temp}°F`);
          break;

        case "rgb":
          command = {
            messagetype: CONSTANTS.MESSAGE_TYPES.TOGGLE_BUTTON,
            messagecmd: 6,
            size: 5,
            data: [params.id, params.r, params.g, params.b, params.mode || 0],
          };
          log(
            `Setting RGB (ID: ${params.id}) to R:${params.r}, G:${params.g}, B:${params.b}`
          );
          break;

        case "mode":
          const modeValue = CONSTANTS.MODE_VALUES[params.mode] ?? 0;
          command = {
            messagetype: CONSTANTS.MESSAGE_TYPES.TOGGLE_BUTTON,
            messagecmd: 4,
            size: 3,
            data: [params.id, 0, modeValue],
          };
          log(`Setting mode ${params.id} to: ${params.mode}`);
          break;

        case "zone-brightness":
          const zoneOffset = 200 + parseInt(params.zone, 10);
          command = {
            messagetype: CONSTANTS.MESSAGE_TYPES.TOGGLE_BUTTON,
            messagecmd: 3,
            size: 5,
            data: [
              zoneOffset,
              0,
              0,
              params.brightness & 0xff,
              (params.brightness >> 8) & 0xff,
            ],
          };
          log(
            `Setting Zone ${params.zone} brightness to: ${params.brightness}%`
          );
          break;

        case "zone-mode":
          const zoneModeOffset = 300 + parseInt(params.zone, 10);
          const zoneModeValue = CONSTANTS.MODE_VALUES[params.mode];
          command = {
            messagetype: CONSTANTS.MESSAGE_TYPES.TOGGLE_BUTTON,
            messagecmd: 4,
            size: 3,
            data: [zoneModeOffset, 0, zoneModeValue],
          };
          log(`Setting Zone ${params.zone} mode to: ${params.mode}`);
          break;

        case "fan-speed":
          command = {
            messagetype: CONSTANTS.MESSAGE_TYPES.TOGGLE_BUTTON,
            messagecmd: 4,
            size: 3,
            data: [params.id, 0, params.speed],
          };
          log(`Setting fan speed (ID: ${params.id}) to: ${params.speed}`);
          break;

        default:
          log(`Unknown command type: ${type}`);
          return false;
      }

      socket.send(JSON.stringify(command));
      return true;
    } catch (error) {
      log(`Error sending command: ${error.message || error}`);
      return false;
    }
  }

  // --------------------------
  // UI Setup & Event Handlers
  // --------------------------

  // Generic tab switching function for multiple tab systems
  function setupTabSystem(
    tabBtns,
    contentSelector,
    activeClass = "active",
    dataAttr
  ) {
    if (!tabBtns || tabBtns.length === 0) return;

    // Using event delegation for efficiency
    const tabContainer = tabBtns[0].parentElement;
    if (!tabContainer) return;

    tabContainer.addEventListener("click", (e) => {
      const button = e.target.closest(
        tabBtns[0].tagName + "[" + dataAttr + "]"
      );
      if (!button) return;

      // Deactivate all tabs and contents
      tabBtns.forEach((btn) => btn.classList.remove(activeClass));
      const allContents = document.querySelectorAll(contentSelector);
      allContents.forEach((content) => content.classList.remove(activeClass));

      // Activate clicked tab and corresponding content
      button.classList.add(activeClass);
      const tabId = button.getAttribute(dataAttr) + "-tab";
      const content = document.getElementById(tabId);
      if (content) content.classList.add(activeClass);
    });

    // Ensure one tab is active initially if none are
    if (
      !Array.from(tabBtns).some((btn) => btn.classList.contains(activeClass))
    ) {
      tabBtns[0].click();
    }
  }

  function initializeButtons() {
    // Connect/disconnect buttons
    DOM.connectBtn?.addEventListener("click", connectWebSocket);
    DOM.disconnectBtn?.addEventListener("click", () => {
      if (socket) {
        socket.close();
        stopHeartbeat();
      }
    });

    // Define button exclusivity groups
    const hvacIds = new Set(["24", "89", "23", "22", "25", "26", "27"]);
    const modeButtonIds = new Set([
      "51",
      "52",
      "53",
      "54",
      "55",
      "56",
      "57",
      "58",
    ]);
    const exclusiveIds = new Set();
    EXCLUSIVE_BUTTON_GROUPS.forEach((group) => {
      group.forEach((id) => exclusiveIds.add(id));
    });

    // Attach general toggle listener only for buttons not handled elsewhere
    DOM.toggleButtons.forEach((btn) => {
      // Don't add general handler to HVAC or RGB/White mode buttons
      if (!hvacIds.has(btn.dataset.id) && !modeButtonIds.has(btn.dataset.id)) {
        btn.addEventListener("click", () => {
          const componentId = parseInt(btn.dataset.id, 10);

          // Check if button is part of an exclusive group
          if (exclusiveIds.has(btn.dataset.id)) {
            // Find the button's group
            const group = EXCLUSIVE_BUTTON_GROUPS.find((g) =>
              g.includes(btn.dataset.id)
            );
            if (group) {
              // Deactivate all other buttons in the group
              group.forEach((id) => {
                const groupBtn = document.querySelector(
                  `.toggle-btn[data-id="${id}"]`
                );
                if (groupBtn && groupBtn !== btn) {
                  groupBtn.classList.remove("active");
                  // Send the off command for the other buttons in group
                  sendCommand("toggle", { id: parseInt(id, 10), state: false });
                }
              });
            }
          }

          const isActive = btn.classList.toggle("active");
          sendCommand("toggle", { id: componentId, state: isActive });
        });
      }
    });

    // Momentary buttons
    DOM.momentaryButtons.forEach((btn) => {
      const handleDown = (e) => {
        e.preventDefault();
        const id = parseInt(btn.dataset.id, 10);
        sendCommand("button", { id, state: true });
        btn.classList.add("active");
      };

      const handleUp = (e) => {
        e.preventDefault();
        const id = parseInt(btn.dataset.id, 10);
        sendCommand("button", { id, state: false });
        btn.classList.remove("active");
      };

      btn.addEventListener("mousedown", handleDown);
      btn.addEventListener("mouseup", handleUp);
      btn.addEventListener("mouseleave", handleUp);
      btn.addEventListener("touchstart", handleDown);
      btn.addEventListener("touchend", handleUp);
    });

    // MultiPlus buttons
    const multiplusBtns = document.querySelectorAll(".multiplus-btn");
    multiplusBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        multiplusBtns.forEach((b) => b.classList.remove("active"));
        this.classList.add("active");

        const mode = this.getAttribute("data-mode");
        const componentId = parseInt(this.getAttribute("data-id"), 10);
        sendCommand("mode", { id: componentId, mode });
      });
    });
  }

  function setupSliders() {
    // Generic slider setup with debouncing for performance
    const sliders = document.querySelectorAll("input[type='range']");
    let sliderTimeout = null;

    sliders.forEach((slider) => {
      // For lighting sliders with color/brightness
      if (slider.classList.contains("color-slider")) {
        slider.addEventListener("input", () => {
          const zone = slider.getAttribute("data-zone");
          const hue = parseInt(slider.value, 10);
          const colorName = getColorName(hue);
          const hexColor = hslToHex(hue, 100, 50);

          // Update color name if there's a display element
          const valueDisplay = slider.nextElementSibling;
          if (valueDisplay) valueDisplay.textContent = colorName;

          // Convert to RGB and send command with debouncing
          clearTimeout(sliderTimeout);
          sliderTimeout = setTimeout(() => {
            const r = parseInt(hexColor.substring(1, 3), 16);
            const g = parseInt(hexColor.substring(3, 5), 16);
            const b = parseInt(hexColor.substring(5, 7), 16);
            const zoneOffset = 100 + parseInt(zone, 10);
            sendCommand("rgb", { id: zoneOffset, r, g, b });
          }, 50);
        });
        return;
      }

      // Special handling for zone brightness sliders
      if (slider.id.startsWith("brightness-zone")) {
        slider.addEventListener("input", () => {
          const zone = slider.getAttribute("data-zone");
          const brightness = parseInt(slider.value, 10);

          // Update display value if it exists
          const valueDisplay = slider.nextElementSibling;
          if (valueDisplay && valueDisplay.classList.contains("slider-value")) {
            valueDisplay.textContent = `${brightness}%`;
          }

          // Send zone brightness with debouncing
          clearTimeout(sliderTimeout);
          sliderTimeout = setTimeout(() => {
            sendCommand("zone-brightness", { zone, brightness });
          }, 50);
        });
        return;
      }

      // Warmth sliders for white mode lighting
      if (slider.classList.contains("warmth-slider")) {
        slider.addEventListener("input", () => {
          const zone = slider.getAttribute("data-zone");
          const temperature = parseInt(slider.value, 10);

          // Update display if it exists
          const valueDisplay = slider.nextElementSibling;
          if (valueDisplay) valueDisplay.textContent = `${temperature}K`;

          // Convert temperature to RGB values for white light
          clearTimeout(sliderTimeout);
          sliderTimeout = setTimeout(() => {
            let r, g, b;
            if (temperature <= 4600) {
              const factor = (temperature - 2700) / (4600 - 2700);
              r = 255;
              g = Math.round(255 * factor);
              b = Math.round(190 * factor);
            } else {
              const factor = (temperature - 4600) / (6500 - 4600);
              r = Math.round(255 * (1 - factor * 0.3));
              g = Math.round(255 * (1 - factor * 0.1));
              b = 255;
            }

            const zoneOffset = 100 + parseInt(zone, 10);
            sendCommand("rgb", { id: zoneOffset, r, g, b, mode: 1 });
          }, 50);
        });
        return;
      }

      // General sliders for other controls
      slider.addEventListener("input", () => {
        const value = parseInt(slider.value, 10);
        const sliderId = slider.id || "slider";
        const commandId = CONSTANTS.SLIDER_IDS[sliderId] || 2;

        // Update value display if there is one
        const valueDisplay = slider.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains("slider-value")) {
          valueDisplay.textContent = `${value}%`;
        }

        // Send with debouncing
        clearTimeout(sliderTimeout);
        sliderTimeout = setTimeout(() => {
          sendCommand("slider", { id: commandId, value });
        }, 50);
      });
    });
  }

  function setupThermostat() {
    if (!DOM.thermostat.slider || !DOM.thermostat.targetTemp) return;

    DOM.thermostat.slider.addEventListener("input", () => {
      DOM.thermostat.targetTemp.textContent = `${DOM.thermostat.slider.value}°F`;
    });

    DOM.thermostat.slider.addEventListener("change", () => {
      sendCommand("thermostat", {
        temp: parseInt(DOM.thermostat.slider.value, 10),
      });
    });
  }

  function setupVentControls() {
    // Setup fan speed controls efficiently
    setupFanControl("ventFan", CONSTANTS.COMMAND_IDS.VENT_FAN);
    setupFanControl("ventFan2", CONSTANTS.COMMAND_IDS.VENT_FAN2);
    setupFanControl("fanSpeed", CONSTANTS.COMMAND_IDS.FAN_SPEED);

    function setupFanControl(controlName, commandId) {
      const control = DOM.fanControls[controlName];
      if (!control.up || !control.down || !control.value) return;

      let fanSpeed = 30; // Default starting value
      control.value.textContent = fanSpeed + "%";

      control.up.addEventListener("click", () => {
        if (fanSpeed < 100) {
          fanSpeed = Math.min(fanSpeed + 10, 100);
          control.value.textContent = `${fanSpeed}%`;
          sendCommand("fan-speed", {
            id: commandId,
            speed: Math.round(fanSpeed / 10),
          });
        }
      });

      control.down.addEventListener("click", () => {
        if (fanSpeed > 0) {
          fanSpeed = Math.max(fanSpeed - 10, 0);
          control.value.textContent = `${fanSpeed}%`;
          sendCommand("fan-speed", {
            id: commandId,
            speed: Math.round(fanSpeed / 10),
          });
        }
      });
    }
  }

  function setupVentilationButtons() {
    // Setup the ventilation button groups (on/off + intake/exhaust)
    setupVentGroup("60", "61", "62");
    setupVentGroup("65", "66", "67");

    function setupVentGroup(onOffId, intakeId, exhaustId) {
      const onOffBtn = document.querySelector(
        `.toggle-btn[data-id="${onOffId}"]`
      );
      const intakeBtn = document.querySelector(
        `.toggle-btn[data-id="${intakeId}"]`
      );
      const exhaustBtn = document.querySelector(
        `.toggle-btn[data-id="${exhaustId}"]`
      );
      if (!onOffBtn || !intakeBtn || !exhaustBtn) return;

      // Mark as vent mode buttons for styling
      intakeBtn.classList.add("vent-mode-btn");
      exhaustBtn.classList.add("vent-mode-btn");

      // Initial state setup
      updateButtonState();

      // Add listeners with state dependency
      onOffBtn.addEventListener("click", () =>
        setTimeout(updateButtonState, 0)
      );

      intakeBtn.addEventListener("click", (e) => {
        if (!onOffBtn.classList.contains("active")) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        if (!intakeBtn.classList.contains("active")) {
          exhaustBtn.classList.remove("active");
          // Send command to turn off exhaust
          sendCommand("toggle", { id: parseInt(exhaustId, 10), state: false });
        }
      });

      exhaustBtn.addEventListener("click", (e) => {
        if (!onOffBtn.classList.contains("active")) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        if (!exhaustBtn.classList.contains("active")) {
          intakeBtn.classList.remove("active");
          // Send command to turn off intake
          sendCommand("toggle", { id: parseInt(intakeId, 10), state: false });
        }
      });

      function updateButtonState() {
        const isOn = onOffBtn.classList.contains("active");
        if (!isOn) {
          intakeBtn.classList.remove("active");
          exhaustBtn.classList.remove("active");
        }
        intakeBtn.classList.toggle("disabled", !isOn);
        exhaustBtn.classList.toggle("disabled", !isOn);
      }
    }
  }

  function setupAcLimitModal() {
    if (!DOM.acLimit.btn || !DOM.acLimit.modal) return;

    // Show modal
    DOM.acLimit.btn.addEventListener("click", (e) => {
      e.preventDefault();
      DOM.acLimit.modal.style.display = "flex";
      DOM.acLimit.value.textContent = currentAcLimit;
      updatePresetButtons(currentAcLimit);
    });

    // Increment limit
    DOM.acLimit.up?.addEventListener("click", () => {
      if (currentAcLimit < 100) {
        currentAcLimit++;
        DOM.acLimit.value.textContent = currentAcLimit;
        updatePresetButtons(currentAcLimit);
      }
    });

    // Decrement limit
    DOM.acLimit.down?.addEventListener("click", () => {
      if (currentAcLimit > 0) {
        currentAcLimit--;
        DOM.acLimit.value.textContent = currentAcLimit;
        updatePresetButtons(currentAcLimit);
      }
    });

    // Close modal handlers
    DOM.acLimit.close?.addEventListener("click", closeModal);
    DOM.acLimit.cancel?.addEventListener("click", closeModal);

    // Apply new limit
    DOM.acLimit.apply?.addEventListener("click", () => {
      sendCommand("mode", {
        id: CONSTANTS.COMMAND_IDS.AC_LIMIT,
        mode: currentAcLimit.toString(),
      });
      closeModal();
    });

    // Preset buttons
    DOM.acLimit.presets.forEach((btn) => {
      btn.addEventListener("click", function () {
        currentAcLimit = parseInt(this.dataset.value, 10);
        DOM.acLimit.value.textContent = currentAcLimit;
        updatePresetButtons(currentAcLimit);
      });
    });

    // Click outside to close
    window.addEventListener("click", (event) => {
      if (event.target === DOM.acLimit.modal) closeModal();
    });

    function closeModal() {
      DOM.acLimit.modal.style.display = "none";
    }

    function updatePresetButtons(value) {
      DOM.acLimit.presets.forEach((b) => {
        b.classList.toggle("active", parseInt(b.dataset.value, 10) === value);
      });
    }
  }

  function setupRgbControls() {
    // Mode toggle buttons (RGB/White)
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const zone = this.getAttribute("data-zone");
        const mode = this.getAttribute("data-mode");
        const componentId = parseInt(this.getAttribute("data-id"), 10);

        // Find all mode buttons for this zone
        const buttons = document.querySelectorAll(
          `.mode-btn[data-zone="${zone}"]`
        );

        // Don't do anything if this button is already active
        if (this.classList.contains("active")) return;

        // Deactivate all mode buttons for this zone and send OFF commands
        buttons.forEach((b) => {
          if (b !== this && b.classList.contains("active")) {
            b.classList.remove("active");
            const bId = parseInt(b.getAttribute("data-id"), 10);
            sendCommand("toggle", { id: bId, state: false });
          }
        });

        // Activate this button and send ON command
        this.classList.add("active");
        sendCommand("toggle", { id: componentId, state: true });

        // Show/hide appropriate sliders based on mode
        const zoneContainer = document.getElementById(`zone${zone}-tab`);
        if (zoneContainer) {
          const rgbGroup = zoneContainer.querySelector(
            `.slider-group[data-slider-type="rgb"]`
          );
          const warmthGroup = zoneContainer.querySelector(
            `.slider-group[data-slider-type="white"]`
          );

          if (rgbGroup)
            rgbGroup.style.display = mode === "rgb" ? "block" : "none";
          if (warmthGroup)
            warmthGroup.style.display = mode === "white" ? "block" : "none";
        }

        // Additionally send the mode command if needed
        sendCommand("zone-mode", { zone, mode });
      });
    });

    // Initialize hue sliders with color values
    document.querySelectorAll(".color-slider").forEach((slider) => {
      const hue = parseInt(slider.value, 10);
      const colorName = getColorName(hue);
      const valueDisplay = slider.nextElementSibling;
      if (valueDisplay) valueDisplay.textContent = colorName;
    });
  }

  function setupRGBLightingButtons() {
    // Setup RGB lighting groups (power + RGB/White mode selection)
    // Using the actual data-id values from HTML
    setupRgbGroup("101", "102", "103", "1"); // Zone 1
    setupRgbGroup("107", "108", "109", "2"); // Zone 2
    setupRgbGroup("113", "114", "115", "3"); // Zone 3
    setupRgbGroup("119", "120", "121", "4"); // Zone 4
  
    function setupRgbGroup(powerId, rgbId, whiteId, zoneNumber) {
      const powerBtn = document.querySelector(`.toggle-btn[data-id="${powerId}"]`);
      const rgbBtn = document.querySelector(`.toggle-btn[data-id="${rgbId}"]`);
      const whiteBtn = document.querySelector(`.toggle-btn[data-id="${whiteId}"]`);
      
      if (!powerBtn || !rgbBtn || !whiteBtn) return;
  
      // Mark as RGB mode buttons for styling
      rgbBtn.classList.add("rgb-mode-btn");
      whiteBtn.classList.add("rgb-mode-btn");
  
      // Initial state setup
      updateButtonState();
  
      // Add listeners with state dependency
      powerBtn.addEventListener("click", () => 
        setTimeout(updateButtonState, 0)
      );
  
      rgbBtn.addEventListener("click", (e) => {
        if (!powerBtn.classList.contains("active")) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        
        if (!rgbBtn.classList.contains("active")) {
          whiteBtn.classList.remove("active");
          // Send command to turn off white mode
          sendCommand("toggle", { id: parseInt(whiteId, 10), state: false });
          
          // Show appropriate sliders
          showSliders("rgb");
          
          // Additionally send the zone mode command if needed
          sendCommand("zone-mode", { zone: zoneNumber, mode: "rgb" });
        }
      });
  
      whiteBtn.addEventListener("click", (e) => {
        if (!powerBtn.classList.contains("active")) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        
        if (!whiteBtn.classList.contains("active")) {
          rgbBtn.classList.remove("active");
          // Send command to turn off RGB mode
          sendCommand("toggle", { id: parseInt(rgbId, 10), state: false });
          
          // Show appropriate sliders
          showSliders("white");
          
          // Additionally send the zone mode command if needed
          sendCommand("zone-mode", { zone: zoneNumber, mode: "white" });
        }
      });
  
      function updateButtonState() {
        const isOn = powerBtn.classList.contains("active");
        
        // Handle power state toggle
        if (!isOn) {
          rgbBtn.classList.remove("active");
          whiteBtn.classList.remove("active");
          showSliders("none");
        } else if (isOn && !rgbBtn.classList.contains("active") && !whiteBtn.classList.contains("active")) {
          // Default to RGB mode when turning on with no mode selected
          rgbBtn.classList.add("active");
          showSliders("rgb");
          sendCommand("toggle", { id: parseInt(rgbId, 10), state: true });
        }
        
        // Add visual disabled state to RGB and White buttons
        rgbBtn.classList.toggle("disabled", !isOn);
        whiteBtn.classList.toggle("disabled", !isOn);
      }
  
      function showSliders(mode) {
        const tab = document.getElementById(`zone${zoneNumber}-tab`);
        if (!tab) return;
        
        const rgbSliders = tab.querySelector('.slider-group[data-slider-type="rgb"]');
        const whiteSliders = tab.querySelector('.slider-group[data-slider-type="white"]');
        
        if (rgbSliders) rgbSliders.style.display = mode === "rgb" ? "block" : "none";
        if (whiteSliders) whiteSliders.style.display = mode === "white" ? "block" : "none";
      }
    }
  }

  // --------------------------
  // Color Utilities
  // --------------------------
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  function hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function getColorName(hue) {
    const colorRanges = [
      { name: "Red", range: [0, 15] },
      { name: "Orange", range: [16, 45] },
      { name: "Yellow", range: [46, 75] },
      { name: "Lime", range: [76, 105] },
      { name: "Green", range: [106, 165] },
      { name: "Teal", range: [166, 195] },
      { name: "Cyan", range: [196, 225] },
      { name: "Blue", range: [226, 255] },
      { name: "Purple", range: [256, 285] },
      { name: "Magenta", range: [286, 335] },
      { name: "Pink", range: [336, 359] },
    ];

    for (const color of colorRanges) {
      if (hue >= color.range[0] && hue <= color.range[1]) {
        return color.name;
      }
    }
    return "Custom";
  }

  // --------------------------
  // Initialization
  // --------------------------
<<<<<<< HEAD
  function initialize() {
    // Setup all UI components
    setupTabSystem(DOM.tabButtons, ".tab-content", "active", "data-tab");
    setupTabSystem(
      DOM.hvacTabButtons,
      ".hvac-tab-content",
      "active",
      "data-hvac-tab"
    );
    setupTabSystem(
      DOM.lightingTabButtons,
      ".lighting-tab-content",
      "active",
      "data-lighting-tab"
    );
    setupTabSystem(
      DOM.rgbZoneButtons,
      ".rgb-zone-content",
      "active",
      "data-zone-tab"
    );
    setupTabSystem(
      DOM.accessoryButtons,
      ".accessory-zone-content",
      "active",
      "data-accessory-tab"
    );
    setupRGBLightingButtons();
    setupThermostat();
    setupSliders();
    setupVentControls();
    setupRgbControls();
    setupVentilationButtons();
    setupAcLimitModal();
    initializeButtons();
    connectWebSocket();
=======
  document
    .getElementById("show-monitor")
    ?.addEventListener("click", showSignalMonitor)
  document.addEventListener("DOMContentLoaded", () => {
    setupMainTabs()
    setupHvacTabs()
    setupLightingTabs()
    setupThermostat()
    setupSliders()
    setupVentControls()
    setupRgbZones()
    setupHvacModeButtons()
    setupMutuallyExclusiveButtons()
    setupVentilationButtons()
    setupAcLimitModal()
    connectWebSocket()
    initializeButtons()
    setTimeout(() => {
      const overlay = document.getElementById("splash-overlay")
      // Add the 'hidden' class to fade out the overlay
      overlay.classList.add("hidden")
>>>>>>> 7ba77be65bcd3a60bde9ba0c526c48e51e04303d

    // Remove splash screen with fade effect
    setTimeout(() => {
      if (DOM.splashOverlay) {
        // Add the hidden class to trigger the CSS transition
        DOM.splashOverlay.classList.add("hidden");

        // Remove from DOM only after transition is fully complete
        setTimeout(() => {
          DOM.splashOverlay.remove();
        }, 1800); // Slightly longer than transition to ensure completion
      }
    }, 3000);
  }

  // Start everything when DOM is ready
  document.addEventListener("DOMContentLoaded", initialize);
})();
