<script lang="ts">
  // NextUp - Tournament Match Assignment Tool
  // Main application component

  let tournamentName = $state('NextUp')
  let isConnected = $state(false)
</script>

<main>
  <header>
    <h1>{tournamentName}</h1>
    <div class="status">
      <span class="obs-indicator" class:connected={isConnected}>
        {isConnected ? 'OBS Connected' : 'OBS Disconnected'}
      </span>
    </div>
  </header>

  <section class="content">
    <p class="welcome">Tournament Match Assignment Tool</p>
    <p class="subtitle">Select a tournament to begin assigning matches to arenas</p>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background: #1a1a2e;
    color: #eaeaea;
    min-height: 100vh;
  }

  main {
    max-width: 600px;
    margin: 0 auto;
    padding: 1rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid #333;
    margin-bottom: 2rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    color: #00d4ff;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .obs-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-size: 0.875rem;
    background: #2d2d44;
  }

  .obs-indicator::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff4757;
  }

  .obs-indicator.connected::before {
    background: #2ed573;
  }

  .content {
    text-align: center;
    padding: 3rem 1rem;
  }

  .welcome {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #888;
    font-size: 0.9rem;
  }
</style>
