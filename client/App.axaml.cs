using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Data.Core;
using Avalonia.Data.Core.Plugins;
using Avalonia.Markup.Xaml;
using client.ViewModels;
using client.Views;

namespace client
{
    public partial class App : Application
    {
        public override void Initialize()
        {
            AvaloniaXamlLoader.Load(this);
        }

        public override void OnFrameworkInitializationCompleted()
        {
            if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
            {
                // The line below might exist if you have validation plugins; if not, ignore
                BindingPlugins.DataValidators.RemoveAt(0);

                // INSTEAD of scoreboard as main window, let's set HomeWindow as the main window
                desktop.MainWindow = new HomeWindow();
            }
            else if (ApplicationLifetime is ISingleViewApplicationLifetime singleViewPlatform)
            {
                // (If you do single-view approach, adapt accordingly)
                // singleViewPlatform.MainView = ...
            }

            base.OnFrameworkInitializationCompleted();
        }
    }
}