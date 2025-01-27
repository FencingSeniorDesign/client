using System;
using System.Timers;
using Avalonia.Controls;
using Avalonia.Threading;

namespace client.Views
{
    public partial class FencingScoreboardView : UserControl
    {
        private int _fencer1Score = 0;
        private int _fencer2Score = 0;
        private TimeSpan _timeLeft = TimeSpan.FromMinutes(3);
        private Timer _timer;

        public FencingScoreboardView()
        {
            InitializeComponent();

            // Initialize Timer
            _timer = new Timer(1000); // 1-second interval
            _timer.Elapsed += OnTimerTick;

            // Update UI
            UpdateScores();
            UpdateTimer();
        }

        private void OnTimerTick(object? sender, ElapsedEventArgs e)
        {
            if (_timeLeft.TotalSeconds > 0)
            {
                _timeLeft = _timeLeft.Subtract(TimeSpan.FromSeconds(1));
                Dispatcher.UIThread.Invoke(UpdateTimer);
            }
            else
            {
                _timer.Stop();
            }
        }

        private void UpdateScores()
        {
            Fencer1Score.Text = _fencer1Score.ToString();
            Fencer2Score.Text = _fencer2Score.ToString();
        }

        private void UpdateTimer()
        {
            TimerText.Text = _timeLeft.ToString(@"mm\:ss");
        }

        private void OnFencer1AddScore(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
        {
            _fencer1Score++;
            UpdateScores();
        }

        private void OnFencer1SubtractScore(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
        {
            if (_fencer1Score > 0) _fencer1Score--;
            UpdateScores();
        }

        private void OnFencer2AddScore(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
        {
            _fencer2Score++;
            UpdateScores();
        }

        private void OnFencer2SubtractScore(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
        {
            if (_fencer2Score > 0) _fencer2Score--;
            UpdateScores();
        }

        private void OnDouble(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
        {
            _fencer1Score++;
            _fencer2Score++;
            UpdateScores();
        }
    }
}
