using Avalonia.Controls;
using Avalonia.Interactivity;

namespace client.Views
{
    public partial class HomeWindow : Window
    {
        public HomeWindow()
        {
            InitializeComponent();
        }

        private void OnOpenScoreboard(object? sender, RoutedEventArgs e)
        {
            // Create a new scoreboard window, passing THIS window reference
            var scoreboardWindow = new FencingScoreboardWindow(this);
            scoreboardWindow.Show();
            
            // Hide the home window so only scoreboard shows
            this.Hide();
        }
    }
}