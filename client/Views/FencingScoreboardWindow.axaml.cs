using Avalonia.Controls;
using Avalonia.Interactivity;

namespace client.Views
{
    public partial class FencingScoreboardWindow : Window
    {
        private HomeWindow? _homeWindow;

        // Default constructor (used by XAML preview tools, or if needed elsewhere)
        public FencingScoreboardWindow()
        {
            InitializeComponent();
        }

        // Constructor that receives reference to the HomeWindow
        public FencingScoreboardWindow(HomeWindow homeWindow)
        {
            InitializeComponent();
            _homeWindow = homeWindow;
        }

        private void OnGoBackClicked(object? sender, RoutedEventArgs e)
        {
            // Show the original home window if we have one
            _homeWindow?.Show();

            // Close this scoreboard window
            this.Close();
        }
    }
}