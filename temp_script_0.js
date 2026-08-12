
      (function () {
        try {
          const theme = localStorage.getItem("idms_theme") || "system";
          const isDark =
            theme === "dark" ||
            (theme === "system" &&
              window.matchMedia("(prefers-color-scheme: dark)").matches);
          if (isDark) document.documentElement.classList.add("dark");
        } catch (e) {}
      })();
    
